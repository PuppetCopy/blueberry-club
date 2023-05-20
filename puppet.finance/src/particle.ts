import * as THREE from 'three'


const screenWidth = window.innerWidth
const screenHeight = window.innerHeight

const roundedSquareWave = (t: number, delta: number, a: number, f: number) => {
  return ((2 * a) / Math.PI) * Math.atan(Math.sin(2 * Math.PI * t * f) / delta)
}

const scene = new THREE.Scene()
scene.background = new THREE.Color('black')

const camera = new THREE.OrthographicCamera(
  -screenWidth / (20 * 10),
  screenWidth / (20 * 10),
  screenHeight / (20 * 10),
  -screenHeight / (20 * 10),
  0.1,
  1000
)

const renderer = new THREE.WebGLRenderer()
renderer.setSize(screenWidth, screenHeight)

document.body.appendChild(renderer.domElement)


const material = new THREE.MeshBasicMaterial()
const geometry = new THREE.CircleGeometry(0.15)
const circle = new THREE.InstancedMesh(geometry, material, 10000)

populateCircles(circle)
scene.add(circle)

scene.background = new THREE.Color('#a493af')

camera.position.z = 300

const clock = new THREE.Clock()
export const animate = function () {
  requestAnimationFrame(animate)
  updateCircles(clock)
  renderer.render(scene, camera)
}


function populateCircles(instancedCircles: THREE.InstancedMesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>) {
  const vec = new THREE.Vector3()
  const positions = []
  const distances = []

  for (let i = 0; i < 10000; ++i) {
    const position = new THREE.Vector3()
    position.x = (i % 100) - 50
    position.y = Math.floor(i / 100) - 50
    position.y += (i % 2) * 0.5
    position.x += Math.random() * 0.3
    position.y += Math.random() * 0.3
    positions.push(position)
    const right = new THREE.Vector3(1, 0, 0)
    distances.push(position.length() + Math.cos(position.angleTo(right) * 8) * 0.5)
    vec.copy(position).multiplyScalar(0)
    instancedCircles.setMatrixAt(i, vec)
  }
  instancedCircles.positions = positions
  instancedCircles.distances = distances
}

function updateCircles(clock: THREE.Clock) {
  const vec = new THREE.Vector3()
  const transform = new THREE.Matrix4()
  const positions = circle.positions
  const distances = circle.distances

  for (let i = 0; i < 10000; ++i) {
    const dist = distances[i]
    const t = clock.getElapsedTime() - dist / 25
    const wave = roundedSquareWave(t, 0.15 + (0.2 * dist) / 72, 0.4, 1 / 3.8)
    vec.copy(positions[i]).multiplyScalar(wave + 1.3)
    transform.setPosition(vec)
    circle.setMatrixAt(i, transform)
  }
  circle.instanceMatrix.needsUpdate = true
}