import { useEffect, useRef, useState } from "react";

/**
 * useActiveSpeaker
 * Voice-activity detection across every audio stream in the call. Drives the
 * speaking ring on tiles, the participant-panel indicator, and the automatic
 * spotlight used by the Speaker / Sidebar / PiP layouts.
 *
 * How it works: one shared AudioContext, one AnalyserNode per stream. Each
 * animation frame we take the RMS of the time-domain samples (a cheap, decent
 * proxy for loudness) and compare it against a threshold. This is entirely
 * local — nothing extra goes over the socket.
 *
 * Two bits of hysteresis stop the indicator strobing on ordinary speech,
 * which naturally dips between syllables:
 *   - a level must cross SPEAKING_THRESHOLD to start counting as speech
 *   - once speaking, it holds for RELEASE_MS after dropping back below
 *
 * `activeSpeakerId` is deliberately sticky: it only moves to a new person
 * once they have been loudest for SWITCH_MS. Without that, a cough or a
 * keyboard clatter would yank the spotlight away mid-sentence.
 *
 * @param {Array<{id: string, stream: MediaStream|null, micOn?: boolean}>} sources
 * @param {boolean} [enabled=true] pass false to tear all analysis down
 * @returns {{ speakingIds: Set<string>, activeSpeakerId: string|null, levels: Record<string, number> }}
 */

const SPEAKING_THRESHOLD = 0.045; // RMS above which we call it speech
const RELEASE_MS = 600;           // hold "speaking" this long after it drops
const SWITCH_MS = 900;            // loudest for this long before spotlight moves

export default function useActiveSpeaker(sources, enabled = true) {
  const [speakingIds, setSpeakingIds] = useState(() => new Set());
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);

  const audioCtxRef = useRef(null);
  const nodesRef = useRef(new Map()); // id -> { stream, source, analyser, data, lastLoudAt }
  const rafRef = useRef(null);
  const sourcesRef = useRef(sources);
  // Spotlight candidacy, kept in refs so tracking it never causes a render.
  const candidateRef = useRef({ id: null, since: 0 });
  const activeSpeakerRef = useRef(null);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    if (!enabled) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return; // no WebAudio: indicators stay off, call still works

    let cancelled = false;

    // Captured once up front so the cleanup below reads the same Map
    // instance it worked with all along (react-hooks/exhaustive-deps wants
    // ref reads inside a cleanup to go through a local variable, not
    // `.current` directly, since `.current` could theoretically point
    // somewhere else by unmount time). nodesRef's Map is never reassigned —
    // only mutated via .set/.delete/.clear — so `nodes` and `nodesRef.current`
    // are always the same object for the lifetime of this effect.
    const nodes = nodesRef.current;

    const getCtx = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtx();
      }
      // Browsers start contexts suspended until a user gesture; by the time
      // we are in a call the user has clicked plenty, so this resolves.
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    };

    const detach = (id) => {
      const node = nodes.get(id);
      if (!node) return;
      try {
        node.source.disconnect();
        node.analyser.disconnect();
      } catch {
        // already torn down
      }
      nodes.delete(id);
    };

    // Reconcile analyser nodes against the current source list.
    const sync = () => {
      const list = sourcesRef.current || [];
      const seen = new Set();

      for (const item of list) {
        if (!item?.id || !item.stream) continue;
        // Camera-only / screen-share streams have nothing to analyse.
        if (item.stream.getAudioTracks().length === 0) continue;

        seen.add(item.id);
        const existing = nodes.get(item.id);
        if (existing && existing.stream === item.stream) continue;
        if (existing) detach(item.id);

        try {
          const ctx = getCtx();
          const source = ctx.createMediaStreamSource(item.stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.4;
          source.connect(analyser);
          // NOTE: the analyser is deliberately NOT connected to
          // ctx.destination. Remote audio is already played by the <video>
          // element, so routing it here too would double it — and the local
          // mic would echo straight back at the user.
          nodes.set(item.id, {
            stream: item.stream,
            source,
            analyser,
            data: new Uint8Array(analyser.fftSize),
            lastLoudAt: 0,
          });
        } catch {
          // Stream ended between render and now — skip it.
        }
      }

      for (const id of Array.from(nodes.keys())) {
        if (!seen.has(id)) detach(id);
      }
    };

    const tick = () => {
      if (cancelled) return;

      sync();

      const now = performance.now();
      const list = sourcesRef.current || [];
      // A muted mic can never read as speaking, whatever the analyser sees
      // in the moments before the track actually goes silent.
      const micOffIds = new Set(list.filter((i) => i.micOn === false).map((i) => i.id));

      const nextSpeaking = new Set();
      let loudestId = null;
      let loudestLevel = 0;

      for (const [id, node] of nodes) {
        node.analyser.getByteTimeDomainData(node.data);

        let sumSquares = 0;
        for (let i = 0; i < node.data.length; i++) {
          const sample = (node.data[i] - 128) / 128; // -1..1
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / node.data.length);

        const muted = micOffIds.has(id);
        const level = muted ? 0 : rms;

        if (!muted && rms >= SPEAKING_THRESHOLD) node.lastLoudAt = now;
        // Hysteresis: hold through the natural gaps between words.
        if (!muted && now - node.lastLoudAt < RELEASE_MS) nextSpeaking.add(id);

        if (level > loudestLevel) {
          loudestLevel = level;
          loudestId = id;
        }
      }

      const contender = loudestLevel >= SPEAKING_THRESHOLD ? loudestId : null;

      if (contender && contender !== activeSpeakerRef.current) {
        if (candidateRef.current.id !== contender) {
          candidateRef.current = { id: contender, since: now };
        } else if (now - candidateRef.current.since >= SWITCH_MS) {
          activeSpeakerRef.current = contender;
          setActiveSpeakerId(contender);
          candidateRef.current = { id: null, since: 0 };
        }
      } else if (contender === activeSpeakerRef.current) {
        candidateRef.current = { id: null, since: 0 };
      }

      // Whoever holds the spotlight keeps it when the room falls quiet — the
      // last person to speak is still the most relevant thing to look at.
      // But if they leave the call entirely, drop it.
      if (activeSpeakerRef.current && !list.some((i) => i.id === activeSpeakerRef.current)) {
        activeSpeakerRef.current = null;
        setActiveSpeakerId(null);
      }

      // Bail out of the state update when the set is unchanged, otherwise
      // this would re-render the whole call tree ~60x a second.
      setSpeakingIds((prev) => {
        if (prev.size === nextSpeaking.size && [...prev].every((id) => nextSpeaking.has(id))) {
          return prev;
        }
        return nextSpeaking;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const id of Array.from(nodes.keys())) detach(id);
      nodes.clear();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
      activeSpeakerRef.current = null;
      candidateRef.current = { id: null, since: 0 };
    };
  }, [enabled]);

  return { speakingIds, activeSpeakerId };
}
