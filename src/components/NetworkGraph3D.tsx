import { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { useReducedMotion } from 'framer-motion'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

// --- Data ---------------------------------------------------------------

// Convert SVG space (680×420, origin top-left) → 3D scene space (centered, Y-up)
const p = (x: number, y: number, z: number): [number, number, number] => [
  (x - 340) / 80,
  -(y - 210) / 80,
  z,
]

const NODES: Record<string, [number, number, number]> = {
  n0:  p(65,  92,  0.8),
  n1:  p(188, 57,  -0.4),  // VEYMONT
  n2:  p(318, 42,  -0.6),
  n3:  p(452, 82,   0.8),  // PELLERIN
  n4:  p(572, 52,   0.3),
  n5:  p(622, 168, -1.0),
  n6:  p(498, 228,  0.6),
  n7:  p(358, 192, -0.4),
  n8:  p(218, 202, -0.7),  // ARCTUS
  n9:  p(112, 272,  0.8),
  n10: p(278, 328,  0.6),  // STRAND
  n11: p(418, 362, -0.9),
  n12: p(552, 338,  0.5),
  n13: p(642, 272, -0.6),
  n14: p(142, 378,  1.0),
  n15: p(58,  298, -0.3),
  n16: p(378, 392,  0.4),
  n17: p(528, 392, -0.8),
}

const REGULAR = [
  'n0','n2','n4','n5','n6','n7','n9','n11','n12','n13','n14','n15','n16','n17',
]

const ACCENT = [
  { key: 'n1',  label: 'MENARA',  r: 0.19, phase: 0              },
  { key: 'n3',  label: 'PERDANA', r: 0.24, phase: Math.PI / 2    },
  { key: 'n8',  label: 'SURIA',   r: 0.22, phase: Math.PI        },
  { key: 'n10', label: 'AMPANG',  r: 0.21, phase: Math.PI * 1.5  },
]

// Edges are listed start→end so signal pulses appear to flow along the chains,
// rippling outward toward the accent (key-relationship) nodes.
const EDGES: [string, string][] = [
  ['n0','n1'],  ['n1','n2'],  ['n2','n3'],  ['n3','n4'],  ['n4','n5'],
  ['n5','n6'],  ['n3','n6'],  ['n6','n7'],  ['n7','n8'],  ['n8','n1'],
  ['n8','n9'],  ['n9','n10'], ['n10','n7'], ['n10','n11'],['n11','n12'],
  ['n12','n13'],['n13','n6'], ['n12','n17'],['n10','n14'],['n14','n15'],
  ['n15','n9'], ['n16','n11'],['n16','n17'],
]

// Degree = how connected each client is. Hubs read bigger and brighter.
const DEGREE: Record<string, number> = {}
for (const [a, b] of EDGES) {
  DEGREE[a] = (DEGREE[a] ?? 0) + 1
  DEGREE[b] = (DEGREE[b] ?? 0) + 1
}

const C_BASE = '#b9b0a0' // resting edge: dim warm grey
const C_PULSE = '#eb9430' // travelling signal + accent nodes: amber

// --- Sub-components -------------------------------------------------------

// Edges carry signal pulses that travel along each connection (vDist 0→1) and
// ripple, desynced by a per-edge seed. Resting state is the quiet network
// structure; the pulse is where the amber lives.
function SignalEdges({ reduced }: { reduced: boolean }) {
  const { geo, mat } = useMemo(() => {
    const positions: number[] = []
    const dists: number[] = []
    const seeds: number[] = []
    for (const [a, b] of EDGES) {
      const pa = NODES[a]
      const pb = NODES[b]
      positions.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2])
      dists.push(0, 1)
      const s = Math.random()
      seeds.push(s, s)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('aDist', new THREE.Float32BufferAttribute(dists, 1))
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1))

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntro: { value: reduced ? 1 : 0 },
        uReduced: { value: reduced ? 1 : 0 },
        uBase: { value: new THREE.Color(C_BASE) },
        uPulse: { value: new THREE.Color(C_PULSE) },
      },
      vertexShader: /* glsl */ `
        attribute float aDist;
        attribute float aSeed;
        varying float vDist;
        varying float vSeed;
        varying float vFade;
        void main() {
          vDist = aDist;
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFade = smoothstep(9.5, 2.5, -mv.z); // depth: far edges recede
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform float uTime;
        uniform float uIntro;
        uniform float uReduced;
        uniform vec3 uBase;
        uniform vec3 uPulse;
        varying float vDist;
        varying float vSeed;
        varying float vFade;
        void main() {
          float baseA = 0.34 * mix(0.45, 1.0, vFade);
          vec3 col = uBase;
          float a = baseA;
          if (uReduced < 0.5) {
            float phase = fract(uTime * 0.2 + vSeed);
            float d = abs(vDist - phase);
            float g = smoothstep(0.17, 0.0, d);
            col = mix(uBase, uPulse, g);
            a = (baseA + g * 0.62 * vFade) * uIntro;
          }
          gl_FragColor = vec4(col, a);
        }
      `,
    })
    return { geo: g, mat: m }
  }, [reduced])

  const intro = useRef(reduced ? 1 : 0)
  useFrame((_, delta) => {
    mat.uniforms.uTime.value += delta
    if (!reduced && intro.current < 1) {
      intro.current = Math.min(1, intro.current + delta / 1.1)
      mat.uniforms.uIntro.value = intro.current
    }
  })

  return <lineSegments geometry={geo} material={mat} />
}

function makeHaloTexture(): THREE.Texture {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(235,148,48,0.55)')
  g.addColorStop(0.35, 'rgba(235,148,48,0.20)')
  g.addColorStop(1, 'rgba(235,148,48,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function RegularNodes() {
  return (
    <>
      {REGULAR.map((key) => {
        const deg = DEGREE[key] ?? 1
        const r = Math.min(0.16, 0.085 + (deg - 1) * 0.02)
        return (
          <mesh key={key} position={NODES[key]}>
            <sphereGeometry args={[r, 16, 16]} />
            <meshStandardMaterial
              color="#f6f5f1"
              emissive="#f6f5f1"
              emissiveIntensity={0.22 + deg * 0.05}
              roughness={0.5}
              metalness={0.0}
            />
          </mesh>
        )
      })}
    </>
  )
}

function AccentNode({
  pos, r, label, phase, reduced, halo,
}: {
  pos: [number, number, number]
  r: number
  label: string
  phase: number
  reduced: boolean
  halo: THREE.Texture
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Sprite>(null)
  const t = useRef(phase)

  useFrame((_, delta) => {
    if (reduced) return
    t.current += delta * (Math.PI / 2) // 4-second period
    const breathe = Math.sin(t.current)
    if (meshRef.current) meshRef.current.scale.setScalar(1 + breathe * 0.09)
    if (haloRef.current) {
      const s = r * (6.5 + breathe * 0.8)
      haloRef.current.scale.set(s, s, s)
    }
  })

  return (
    <group position={pos}>
      <sprite ref={haloRef} scale={[r * 6.5, r * 6.5, r * 6.5]}>
        <spriteMaterial
          map={halo}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <mesh ref={meshRef}>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial
          color="#e58c24"
          emissive={C_PULSE}
          emissiveIntensity={0.45}
          roughness={0.3}
          metalness={0.05}
          fog={false}
        />
      </mesh>
      <Html
        position={[0, -(r + 0.2), 0]}
        center
        distanceFactor={8}
        zIndexRange={[40, 0]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <span style={{
          fontFamily: "'Red Hat Mono', 'Roboto Mono', monospace",
          fontSize: '10px',
          color: '#d8cfbd',
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </Html>
    </group>
  )
}

// Lets normal scroll pass through to the page; zoom only engages while a
// modifier is held (the map-embed convention). Trackpad pinch arrives as a
// ctrlKey wheel event, so it zooms too. OrbitControls' own wheel zoom stays
// off (its enableZoom is false) to avoid racing this handler; we dolly the
// camera ourselves and only preventDefault when the modifier is down.
function ZoomGate({
  controlsRef, onScrollNoMod,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  onScrollNoMod: () => void
}) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const el = gl.domElement
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) {
        onScrollNoMod() // no modifier: leave the event alone, page scrolls
        return
      }
      e.preventDefault()
      const target = controlsRef.current?.target ?? new THREE.Vector3()
      const offset = camera.position.clone().sub(target)
      const dist = THREE.MathUtils.clamp(
        offset.length() * Math.exp(e.deltaY * 0.0012),
        3, 8.5,
      )
      camera.position.copy(target).add(offset.setLength(dist))
      controlsRef.current?.update()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [gl, camera, controlsRef, onScrollNoMod])
  return null
}

function Scene({
  reduced, controlsRef,
}: {
  reduced: boolean
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const halo = useMemo(() => makeHaloTexture(), [])
  return (
    <>
      <fog attach="fog" args={['#191611', 6.5, 12]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[4, 6, 5]} intensity={0.55} />
      <SignalEdges reduced={reduced} />
      <RegularNodes />
      {ACCENT.map((n) => (
        <AccentNode
          key={n.key}
          pos={NODES[n.key]}
          r={n.r}
          label={n.label}
          phase={n.phase}
          reduced={reduced}
          halo={halo}
        />
      ))}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={false}
        zoomSpeed={0.7}
        minDistance={3}
        maxDistance={8.5}
        autoRotate={!reduced}
        autoRotateSpeed={0.45}
        enableDamping
        dampingFactor={0.06}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />
    </>
  )
}

// --- Root -----------------------------------------------------------------

export default function NetworkGraph3D() {
  const reduced = useReducedMotion() ?? false
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const hintTimer = useRef<number | undefined>(undefined)

  // Transient "hold to zoom" nudge. Driven imperatively on the DOM node rather
  // than via React state: this fires from inside the R3F renderer (ZoomGate),
  // and touching the ref directly sidesteps a cross-reconciler state update.
  const showHint = useCallback(() => {
    const el = hintRef.current
    if (!el) return
    el.style.opacity = '1'
    window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => {
      if (hintRef.current) hintRef.current.style.opacity = '0'
    }, 1300)
  }, [])

  // The porthole is smaller on phones; frame the graph wider so the outer
  // node labels sit inside the circle instead of clipping at the rim.
  const camZ =
    typeof window !== 'undefined' && window.innerWidth < 900 ? 6.4 : 5.2

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, camZ], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <Scene reduced={reduced} controlsRef={controlsRef} />
        <ZoomGate controlsRef={controlsRef} onScrollNoMod={showHint} />
      </Canvas>
      <div
        ref={hintRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '7px 14px',
          borderRadius: '100px',
          background: 'oklch(19% 0.01 70 / 0.86)',
          border: '1px solid oklch(42% 0.012 72 / 0.6)',
          color: '#e8e1d2',
          fontFamily: "'Red Hat Mono', 'Roboto Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: 0,
          transition: 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Hold Ctrl to zoom
      </div>
    </div>
  )
}
