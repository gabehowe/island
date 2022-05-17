import {OrbitControls} from "./OrbitControls.js";

var _instance;
const manager = new THREE.LoadingManager(function () {
    init()
})
const loader = new THREE.FileLoader(manager)
let fShader, vShader;
let sunFShader, sunVShader
THREE.Cache.enabled = true;
loader.load('../shaders/shader.vert', function (data) {
    vShader = data;
},);
loader.load('../shaders/shader.frag', function (data) {
    fShader = data;
},);
loader.load('../shaders/sun/shader.frag', function (data) {
    sunFShader = data;
},);
loader.load('../shaders/sun/shader.vert', function (data) {
    sunVShader = data;
},);

function setVertexPoint(i, array, point) {
    const index = i * 3
    array[index] = point.x
    array[index + 1] = point.y
    array[index + 2] = point.z
}

function indexFromCoords(x, y, rowWidth = 513) {
    return (rowWidth * y) + x
}

function coordsFromIndex(index, rowWidth = 513) {
    return new THREE.Vector2(index % rowWidth, Math.floor(index / rowWidth))
}

function radToDeg(rad) {
    return rad * (180.0 / Math.PI);
}

class Plane {
    constructor(type = 1) {
        this.uniforms = {
            time: {type: 'f', value: 0},
            ucolor: {type: 'v3', value: new THREE.Vector3(1., 1., 1.)},
            uopacity: {type: 'f', value: 0.5}
        };
        this.mesh = this.createMesh(type);
        this.mesh.rotation.x = Math.PI * 1.5
        this.time = 1;
        _instance = this;
    }

    createMesh(type) {
        const geometry = new THREE.PlaneGeometry(512, 512, 512, 512)
        console.log(geometry)
        const vertices = geometry.attributes.position.array
        const resolvedVertices = []
        for (let i = 0; i < vertices.length; i += 3) {
            resolvedVertices.push(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]))
        }
        const buildings = []
        for (let i = 0; i < resolvedVertices.length; i++) {
            const point = resolvedVertices[i]
            let vertexDistance = 0
            if (Math.round(Math.random() * 100) === 1) {
                const pointHeight = Math.random() * 20
                let newPoint = new THREE.Vector3(point.x, point.y, pointHeight)

                setVertexPoint(i, geometry.attributes.position.array, newPoint)
                vertexDistance = Math.round(Math.abs(newPoint.z / 10))
                const coords = coordsFromIndex(i)
                for (let x = -vertexDistance; x <= vertexDistance; x++) {
                    for (let y = -vertexDistance; y <= vertexDistance; y++) {
                        if (x === 0 && y === 0) {
                            continue
                        }
                        const index = indexFromCoords(coords.x + x, coords.y + y)
                        let adjacentPoint = resolvedVertices[index]
                        if (!adjacentPoint) {
                            continue
                        }
                        const height = (Math.abs(x) !== Math.abs(y)) ? Math.max(Math.abs(x), Math.abs(y)) : Math.abs(x)
                        // const height = Math.max(Math.abs(x), Math.abs(y))
                        setVertexPoint(index, geometry.attributes.position.array, new THREE.Vector3(adjacentPoint.x, adjacentPoint.y, ((pointHeight) / height)))
                    }
                }
                if (Math.round(Math.random() * 3) === 1 && vertexDistance > 0) {
                    newPoint.z += (Math.random() * 10) + 2.5
                    setVertexPoint(i, geometry.attributes.position.array, newPoint)
                }
            }
        }

        // let material = new THREE.RawShaderMaterial({
        //     uniforms: this.uniforms, vertexShader: vShader, fragmentShader: fShader, transparent: true
        // })
        let material = new THREE.MeshStandardMaterial()
        material.flatShading = true

        if (type === 0) {
            material = new THREE.RawShaderMaterial({
                uniforms: this.uniforms,
                vertexShader: vShader,
                fragmentShader: fShader,
                color: 0xff0000,
                transparent: true
            })
            return new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material)
        }

        else if (type === 1) {
            return new THREE.Mesh(geometry, material)
        }
        else {
            return new THREE.Points(geometry)
        }
    }

    render(time) {
        this.uniforms.time.value += time * this.time;
    }
}

const canvas = document.getElementById('canvas-webgl');
const renderer = new THREE.WebGLRenderer({
    antialias: true, canvas: canvas,
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
const render = () => {
    plane.render(clock.getDelta());
    controls.update()
    plane.mesh.rotation.z += 0.00125
    renderer.render(scene, camera);
}
let raf;
const renderLoop = () => {
    render();
    raf = requestAnimationFrame(renderLoop);
}

//lively stuffs

let noClock = false;
let _12hour = false;
let noDate = false;
let mmddyy = false;

const dayArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let scene, camera, clock, plane, controls, light
let background = "#0e0e0e";
const init = () => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    clock = new THREE.Clock();
    plane = new Plane();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(parseInt(background.replace('#', '0x')), 1.0);
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    camera.position.set(0, 50, 125);
    camera.lookAt(new THREE.Vector3(0, 28, 0));
    controls = new OrbitControls(camera, renderer.domElement)
    controls.update()

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }
    if (raf) {
        cancelAnimationFrame(raf);
    }

    const sunlight = new THREE.PointLight("#fdf4e4", 1.25, 1000);
    sunlight.castShadow = true
    sunlight.shadow.mapSize.width = 8192
    sunlight.shadow.mapSize.height = 8192
    sunlight.shadow.camera.far = 500
    sunlight.shadow.camera.near = 0.5
    // light.shadow.bias = 0.001
    sunlight.target = plane.mesh
    sunlight.position.set(100, 256, 100);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({color: 0xf5dd40}))
    sunlight.add(sun)
    scene.add(sunlight);

    // scene.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({color: 0x00ff00})))
    // scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.BoxGeometry(10, 10, 10)), new THREE.LineBasicMaterial({color: 0x000000})))

    plane.mesh.receiveShadow = true;
    plane.mesh.castShadow = true;
    plane.mesh.material.needsUpdate = true;
    scene.add(plane.mesh);

    on();
    resizeWindow();
    renderLoop();
}


window.onresize = e => {
    clockPos();
}

function

clockPos() {
    // const clockEl = document.querySelector('.p-summary');
    // clockEl.style.left = window.innerWidth / 2 - clockEl.clientWidth / 2 + "px";
}

function

UpdateClock() {

    /*
        const time = new Date();

        let timeEl = document.getElementById('clock');
        let dateEl = document.getElementById('date');
        let dayEl = document.getElementById('day');

        /!*
        if(noDate && noClock){
          dateEl.style.display="none";
          dayEl.style.display="none";
          timeEl.style.display="none";
          return
        }
        *!/

        if (noClock) timeEl.style.display = "none"; else timeEl.style.display = "block";

        if (noDate) {
            dateEl.style.display = "none";
            dayEl.style.display = "none";
        }
        else {
            dateEl.style.display = "block";
            dayEl.style.display = "block";
        }

        let d = new Date();

        if (_12hour) timeEl.innerHTML = `- ${new Intl.DateTimeFormat('en-US', {
            'hour': '2-digit', 'minute': '2-digit', 'hour12': true
        }).format(d)} -`.replace("AM", '')
                        .replace("PM", ''); else timeEl.innerHTML = `- ${new Intl.DateTimeFormat('en-US', {
            'hour': '2-digit', 'minute': '2-digit', 'hour12': false
        }).format(d)} -`;

        if (mmddyy) dateEl.innerText = new Intl.DateTimeFormat('en-US', {
            'month': 'short', 'day': '2-digit', 'year': '2-digit'
        }).format(d).replace(',', ''); else dateEl.innerText = new Intl.DateTimeFormat('en-GB', {
            'day': '2-digit', 'month': '2-digit', 'year': '2-digit'
        }).format(d).replace(',', '');

        dayEl.innerText = dayArr[d.getDay()];

        setTimeout(UpdateClock, 1000);
    */
}

UpdateClock();

clockPos();

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
            _instance.uniforms.ucolor.value = new THREE.Vector3(tmp.r / 255, tmp.g / 255, tmp.b / 255);
            break;
        case "bgColor":
            background = val;
            init();
            break;
        case "hillOpacityFac":
            _instance.uniforms.uopacity.value = val / 100;
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
