
// Coordinates of path to patrol
const point1 = new Vector3(8, 0, 8)
const point2 = new Vector3(8, 0, 24)
const point3 = new Vector3(24, 0, 24)
const point4 = new Vector3(24, 0, 8)
const path: Vector3[] = [point1, point2, point3, point4]

const TURN_TIME = 0.9

// LerpData component
@Component("lerpData")
export class LerpData {
  array: Vector3[] = path
  origin: number = 0
  target: number = 1
  fraction: number = 0
}

// Rotate component
@Component("timeOut")
export class TimeOut {
  timeLeft: number
  constructor( time: number){
    this.timeLeft = time
  }
}

// component group to hold all entities with a timeOut
export const paused = engine.getComponentGroup(TimeOut)

// Create temple
const temple = new Entity()
temple.addComponent(new GLTFShape('models/Temple.glb'))
temple.addComponent(new Transform({
  position: new Vector3(16, 0, 16),
  rotation: Quaternion.Euler(0,180,0),
  scale: new Vector3(1.6, 1.6, 1.6)
}))

// Add temple to engine
engine.addEntity(temple)

// Create Gnark
let gnark = new Entity()
gnark.addComponent(new Transform({
 position: new Vector3(5, 0, 5)
}))

let gnarkShape = new GLTFShape('models/gnark.glb')

gnark.addComponent(gnarkShape)

let gnarkAnimator = new Animator()
gnark.addComponent(gnarkAnimator)
// Add LerpData component to Gnark
gnark.addComponent(new LerpData())

// Add Gnark to engine
engine.addEntity(gnark)

// Add walk animation
const walkClip = new AnimationState('walk')
gnarkAnimator.addClip(walkClip)
const turnRClip = new AnimationState('turnRight')
turnRClip.looping = false
gnarkAnimator.addClip(turnRClip)
const raiseDeadClip = new AnimationState('raiseDead')
gnarkAnimator.addClip(raiseDeadClip)


// Activate walk animation
walkClip.play()

// Walk System
export class GnarkWalk {
  update(dt: number) {
    if (!gnark.hasComponent(TimeOut) && !raiseDeadClip.playing ){
      let transform = gnark.getComponent(Transform)
      let path = gnark.getComponent(LerpData)
	  walkClip.playing = true
	  turnRClip.playing = false
      if (path.fraction < 1) {
        path.fraction += dt/12
        transform.position = Vector3.Lerp(
          path.array[path.origin],
          path.array[path.target],
          path.fraction
        )
      } else {
        path.origin = path.target
        path.target += 1
        if (path.target >= path.array.length) {
          path.target = 0
        }
        path.fraction = 0
        transform.lookAt(path.array[path.target])
        walkClip.pause()
		turnRClip.play()
		turnRClip.looping = false
        gnark.addComponent(new TimeOut(TURN_TIME))
      }
    }
  }
}

engine.addSystem(new GnarkWalk())

// Wait System
export class WaitSystem {
  update(dt: number) {
    for (let ent of paused.entities){
      let time = ent.getComponentOrNull(TimeOut)
      if (time){
        if (time.timeLeft > 0) {
          time.timeLeft -= dt
        } else {
          ent.removeComponent(TimeOut)
        }
      }
    }
  }
}

engine.addSystem(new WaitSystem())

// React and stop walking when the user gets close enough

export class BattleCry {
  update() {
    let transform = gnark.getComponent(Transform)
    let path = gnark.getComponent(LerpData)
    let dist = distance(transform.position, camera.position)
    if ( dist < 16) {
      if(raiseDeadClip.playing == false){
        raiseDeadClip.reset()
        raiseDeadClip.playing = true
        walkClip.playing = false
        turnRClip.playing = false
	  }
	  let playerPos = new Vector3(camera.position.x, 0, camera.position.z)
      transform.lookAt(playerPos)
    }
    else if (raiseDeadClip.playing){
      raiseDeadClip.stop()
      transform.lookAt(path.array[path.target])
    }
  }
}

engine.addSystem(new BattleCry())

// Object that tracks user position and rotation
const camera = Camera.instance

// Get distance
/*
Note:
This function really returns distance squared, as it's a lot more efficient to calculate.
The square root operation is expensive and isn't really necessary if we compare the result to squared values.
We also use {x,z} not {x,y}. The y-coordinate is how high up it is.
*/
function distance(pos1: Vector3, pos2: Vector3): number {
  const a = pos1.x - pos2.x
  const b = pos1.z - pos2.z
  return a * a + b * b
}




// Add Shark
let shark = new Entity()
shark.addComponent(new Transform({
  position: new Vector3(8, 3, 8)
}))
shark.addComponent(new GLTFShape("models/shark.glb"))

let sharkBlue = new Entity()
sharkBlue.addComponent(new Transform({
  position: new Vector3(0, 4, 0)
}))
sharkBlue.addComponent(new GLTFShape("models/shark.glb"))

// Add animations
/*
NOTE: when you try to get an animation clip that hasn't been created
from a GLTFShape component, the clip is created automatically.
*/
const animator = new Animator();
let clipSwim = new AnimationState("swim")
let clipBite = new AnimationState("bite")
animator.addClip(clipBite);
animator.addClip(clipSwim);

shark.addComponent(animator);

// Activate swim animation
clipSwim.play()

// Add click interaction
shark.addComponent(new OnClick(e => {
  clipBite.playing =! clipBite.playing
}))

// Add shark to engine
engine.addEntity(shark)
engine.addEntity(sharkBlue)

// // Add Gnark to engine
// engine.addEntity(gnark)


// Add 3D model for scenery
const seaBed = new Entity()
seaBed.addComponent(new GLTFShape("models/Underwater.gltf"))
seaBed.addComponent(new Transform({
  position: new Vector3(-8, 0, -8),
  scale: new Vector3(0.8, 0.8, 0.8)
}))
engine.addEntity(seaBed)

function AddGLTF(path: string, position: Vector3, rotation: Vector3, scale?: Vector3, clip?: string) {
let entity = new Entity();

let shape = new GLTFShape(path);
entity.addComponent(shape);

let transform = new Transform();
transform.position = position;
transform.rotation = Quaternion.Euler(rotation.x, rotation.y, rotation.z);
if (scale){
  transform.scale = scale;
}
else{
  transform.scale = Vector3.One();
}
entity.addComponent(transform);

if (clip){
  const animator = new Animator();
  let animation = new AnimationState(clip);
  animator.addClip(animation);
  entity.addComponent(animator);
  animation.play();
}

engine.addEntity(entity);
}

AddGLTF("models/Tree1.gltf", new Vector3(7, 0 ,5), new Vector3(5, 0, 4), Vector3.One(), "Armature_Idle");

// Add BTC Logo source: https://poly.google.com/view/0Zdd-IEkVIc
let btclogo = new Entity()
btclogo.addComponent(new GLTFShape("models/bitcoin2D_sonson.gltf"))
btclogo.addComponent(new Transform({
  position: new Vector3(25, 3, 8)
  scale: new Vector3(10, 10, 10)
  rotation: new Quaternion(90, 0, 0, 90),
}))
engine.addEntity(btclogo)


let avocado = new Entity()
avocado.addComponent(new GLTFShape("models/avocado.gltf"))
avocado.addComponent(new Transform({ 
    position: new Vector3(3, 1, 3), 
    scale: new Vector3(100, 100, 100)
    }))
engine.addEntity(avocado)

const mesh_Cat = new Entity()
// mesh_Cat.setParent(scene)
const gltfShape_5 = new GLTFShape('models/Mesh_Cat.gltf')
mesh_Cat.addComponentOrReplace(gltfShape_5)
const transform_9 = new Transform({
  position: new Vector3(16, 4, 16),
  rotation: new Quaternion(0, 0, 0, 1),
  scale: new Vector3(.1, .1, .1)
})
mesh_Cat.addComponentOrReplace(transform_9)
engine.addEntity(mesh_Cat)

