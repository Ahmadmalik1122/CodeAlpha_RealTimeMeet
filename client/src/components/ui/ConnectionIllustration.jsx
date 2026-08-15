/**
 * ConnectionIllustration
 * Abstract "people connected in real time" scene: a handful of nodes
 * joined by lines that pulse in sequence, echoing the mesh WebRTC
 * connections this app actually makes. Pure inline SVG, no assets.
 */
function ConnectionIllustration() {
  const nodes = [
    { x: 60, y: 70, r: 9, delay: "0s" },
    { x: 190, y: 40, r: 7, delay: "0.4s" },
    { x: 230, y: 150, r: 10, delay: "0.8s" },
    { x: 110, y: 190, r: 6, delay: "1.2s" },
    { x: 40, y: 160, r: 6, delay: "1.6s" },
  ];

  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 0],
    [0, 2],
  ];

  return (
    <svg viewBox="0 0 260 220" className="w-full h-full max-w-xs" aria-hidden="true">
      <defs>
        <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="url(#edgeGrad)"
          strokeWidth="1.5"
          opacity="0.35"
        />
      ))}

      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r + 7}
            fill="url(#edgeGrad)"
            opacity="0.15"
          >
            <animate
              attributeName="opacity"
              values="0.05;0.28;0.05"
              dur="3s"
              begin={n.delay}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={n.x} cy={n.y} r={n.r} fill="url(#edgeGrad)" />
        </g>
      ))}
    </svg>
  );
}

export default ConnectionIllustration;
