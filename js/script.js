import {OrbitControls} from "./OrbitControls.js";
import {Island, rotateAboutPoint} from "./island.js";

const manager = new THREE.LoadingManager(function () {
    init()
})
const loader = new THREE.FileLoader(manager)
let fShader, vShader;
let waterFShader, waterVShader
THREE.Cache.enabled = true;
loader.load('../shaders/shader.vert', function (data) {
    vShader = data;
},);
loader.load('../shaders/shader.frag', function (data) {
    fShader = data;
},);
loader.load('../shaders/water/shader.frag', function (data) {
    waterFShader = data;
},);
loader.load('../shaders/water/shader.vert', function (data) {
    waterVShader = data;
},);


class Ocean {
    constructor() {
        this.uniforms = {
            time: {type: 'f', value: 0}
        }
        this.mesh = this.createMesh()
        this.time = 1;
    }

    createMesh() {
        const size = 2048
        const geometry = new THREE.PlaneBufferGeometry(size, size, size, size)
        const material = new THREE.RawShaderMaterial({
            uniforms: this.uniforms, vertexShader: waterVShader, fragmentShader: waterFShader, transparent: true
        })
        material.flatShading = true
        material.depthWrite = false
        const mesh = new THREE.Mesh(geometry, material)
        mesh.renderOrder = 0
        mesh.rotation.x = Math.PI * 1.5
        mesh.position.y -= 3;
        return mesh
    }

    render(time) {
        this.uniforms.time.value += time * this.time
    }
}

const canvas = document.getElementById('canvas-webgl');
const renderer = new THREE.WebGLRenderer({
    antialias: true, canvas: canvas, powerPreference: "high-performance"
});

const resizeWindow = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
const on = () => {
    $(window).on('resize', () => {
        resizeWindow();
    });
}

let raf;

function render() {
    stats.begin()
    raf = requestAnimationFrame(render);
    const delta = clock.getDelta()
    island.render(delta);
    if (sunlight.position.y < 0) {
        rotateAboutPoint(sunlight, new THREE.Vector3(0.0, 0.0, 0.0), new THREE.Vector3(0.0, 0.0, 1.0), Math.PI * 0.1 / 180, true)
        sunlight.intensity = 0
        sunlight.distance = 0
    }
    else {
        rotateAboutPoint(sunlight, new THREE.Vector3(0.0, 0.0, 0.0), new THREE.Vector3(0.0, 0.0, 1.0), Math.PI * 0.025 / 180, true)
        sunlight.intensity = 1.25
        sunlight.distance = 1000
    }

    controls.update()
    // plane.mesh.rotation.z += 0.00125
    renderer.autoClear = false;
    renderer.clear();
    camera.layers.set(1)
    composer.render();

    renderer.clearDepth()
    camera.layers.set(0)
    renderer.render(scene, camera);
    stats.end()


}

//lively stuffs

let noClock = false;
let _12hour = false;
let noDate = false;
let mmddyy = false;

const dayArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let scene, camera, clock, island, controls, composer, ocean, sun, sunlight, stats
let background = "#005bc2";
const init = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    clock = new THREE.Clock();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(background, 0.393);
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    // camera.position.set(0, 50, 125);
    camera.position.set(0, 350, 875)
    camera.lookAt(new THREE.Vector3(0, 28, 0));

    stats = new Stats()
    stats.showPanel(0)
    document.body.appendChild(stats.domElement)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.3
    controls.update()

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    if (raf) {
        cancelAnimationFrame(raf);
    }
    // the city
    island = new Island(1, scene);
    console.log(island.buildings)

    // the sun
    sunlight = new THREE.DirectionalLight("#fdf4e4", 1.25);
    sunlight.target = island.mesh
    sunlight.castShadow = true
    sunlight.shadow.cascades = 4;
    // sunlight.shadow.mode = "practical"
    sunlight.shadow.mapSize.width = 4096
    sunlight.shadow.mapSize.height = 4096
    sunlight.shadow.camera.far = 2048
    sunlight.shadow.camera.left = -1024
    sunlight.shadow.camera.right = 1024
    sunlight.shadow.camera.top = -2024
    sunlight.shadow.camera.bottom = 2024
    sunlight.shadow.camera.near = 0.5
    // sunlight.shadow.bias = 0.001
    sunlight.target = island.mesh
    sunlight.position.set(961, 50, -6);
    sun = new THREE.Mesh(new THREE.SphereGeometry(9), new THREE.MeshBasicMaterial({color: "#eacf2e"}))
    sun.layers.enable(1)
    sunlight.add(sun)
    scene.add(sunlight);

    // scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({color: 0x00ff00})))
    // scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(10, 10, 10)), new THREE.LineBasicMaterial({color: 0x000000})))

    ocean = new Ocean();
    scene.add(ocean.mesh)


    initBloom()
    on();
    resizeWindow();
    render();
}

function initBloom() {

    const renderScene = new THREE.RenderPass(scene, camera)

    const effectFXAA = new THREE.ShaderPass(THREE.FXAAShader)
    effectFXAA.uniforms.resolution.value.set(2 / window.innerWidth, 2 / window.innerHeight)

    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
    bloomPass.threshold = 0.21
    bloomPass.strength = 2.2
    bloomPass.radius = 1
    bloomPass.renderToScreen = true

    composer = new THREE.EffectComposer(renderer)
    composer.setSize(window.innerWidth, window.innerHeight)

    composer.addPass(renderScene)
    composer.addPass(effectFXAA)
    composer.addPass(bloomPass)

    renderer.gammaInput = true
    renderer.gammaOutput = true
    renderer.toneMappingExposure = Math.pow(0.9, 4.0)
}


function

livelyPropertyListener(name, val) {
    switch (name) {
        case "timeToggle":
            noClock = !val;
            break;
        case "dateToggle":
            noDate = !val;
            break;
        case "_12hour":
            _12hour = val;
            break;
        case "mmddyy":
            mmddyy = !val;
            break;
        case "fontColor":
            document.querySelector(".p-summary").style.color = val;
            break;
        case "hillColor":
            // tmp = hexToRgb(val);
            break;
        case "bgColor":
            background = val;
            init();
            break;
        case "hillOpacityFac":
            break;
    }
}

function

hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)
    } : null;
}

