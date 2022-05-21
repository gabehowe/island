function isAboveWater(point, resolvedVertices, width) {
    const distance = 5
    for (let x = -distance; x <= distance; x++) {
        for (let y = -distance; y <= distance; y++) {
            if (resolvedVertices[indexFromCoords(point.x + x, point.y + y, width + 1)].z < 0) {
                return true
            }
        }
    }
}

function resolveVertices(geometry) {
    const resolvedVertices = []
    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
        resolvedVertices.push(new THREE.Vector4(vertices[i], vertices[i + 1], vertices[i + 2], Math.floor(i / 3)))
    }
    return resolvedVertices
}

class Building {
    constructor(head, scene, material) {
        this.position = scene.localToWorld(head)
        // this.position.x /= 10
        // this.position.y /= 10
        // this.position.z /= 10
        this.xDelta = this.position.x * -1
        this.yDelta = this.position.y * -1
        // this.xDelta = 0
        // this.yDelta = 0

        this.parts = []
        this.material = material
        // for (let x = -this.width; x <= this.width; x++) {
        //     for (let y = -this.width; y <= this.width; y++) {
        //         if (x === 0 && y === 0) {
        //             this.parts.push(new THREE.Vector3(this.position.x + this.xDelta, this.position.y + this.yDelta, this.position.z))
        //             continue
        //         }
        //         let height = (Math.abs(x) !== Math.abs(y)) ? Math.max(Math.abs(x), Math.abs(y)) : Math.abs(x)
        //         if (height === 0) {
        //             height = 1
        //         }
        //
        //         this.parts.push(new THREE.Vector3((this.position.x + x) + this.xDelta, (this.position.y + y) + this.yDelta, this.position.z / height))
        //     }
        // }
        this.mesh = this.build(scene)
    }

    addPart(part) {
        this.parts.push(part)
    }

    build(scene) {
        this.width = Math.round(Math.abs(this.position.z / 10))
        const planeWidth = (2 * this.width) + 2
        const geometry = new THREE.PlaneBufferGeometry(planeWidth, planeWidth, planeWidth, planeWidth)
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.array.length * 3), 3));
        const resolvedVertices = resolveVertices(geometry)
        const index = Math.floor(resolvedVertices.length / 2)
        const coords = coordsFromIndex(index, planeWidth + 1)
        const point = resolvedVertices[index]
        // if (coords.x === Math.floor(planeWidth/ 2) && coords.y === Math.floor(planeWidth / 2)) {
        setVertexPoint(geometry.attributes.position.array, new THREE.Vector4(point.x, point.y, this.position.z, index), resolvedVertices)
        for (let x = -this.width; x <= this.width; x++) {
            for (let y = -this.width; y <= this.width; y++) {
                if (x === 0 && y === 0) {
                    continue
                }
                let height = (Math.abs(x) !== Math.abs(y)) ? Math.max(Math.abs(x), Math.abs(y)) : Math.abs(x)
                if (height === 0) {
                    height = 1
                }
                const index = indexFromCoords(coords.x + x, coords.y + y, planeWidth + 1)
                const adjacentPoint = resolvedVertices[index]
                if (adjacentPoint === undefined) continue
                setVertexPoint(geometry.attributes.position.array, new THREE.Vector4(adjacentPoint.x, adjacentPoint.y, this.position.z / height, index), resolvedVertices)
            }
            // setVertexPoint(geometry.attributes.position.array, point, resolvedVertices)
        }

        if (Math.round(Math.random() * 3) === 1 && this.width > 0) {
            setVertexPoint(geometry.attributes.position.array, new THREE.Vector4(point.x, point.y, this.position.z + (Math.random() * 10) + 2.5, Math.floor(resolvedVertices.length / 2)), resolvedVertices)
        }
        const mesh = new THREE.Mesh(geometry, this.material)
        // const mesh = new THREE.Points(geometry, pointsMaterial)
        mesh.receiveShadow = true;
        // mesh.doubleSided = true
        mesh.castShadow = true;
        mesh.position.set(this.position.x, this.position.y, -0.1)
        mesh.frustumCulled = false;
        scene.add(mesh)

        rotateAboutPoint(mesh, new THREE.Vector3(), new THREE.Vector3(1.0, 0.0, 0.0), Math.PI * -90 / 180, true)
        return mesh
    }

    demolish(geometry, resolvedVertices) {
        for (const child of this.parts) {
            setVertexPoint(geometry.attributes.position.array, new THREE.Vector3(child.x, child.y, 0), resolvedVertices)
        }
        setVertexPoint(geometry.attributes.position.array, new THREE.Vector3(this.position.x, this.position.y, 0), resolvedVertices)
    }
}


function buildBuildings(geometry, width, resolvedVertices, citySize, scene) {
    const buildings = []
    const slopeMult = -0.02
    const buildingColors = ["#bb8781", "#b5a89f", "#e9e1d6", "#449ea7", "#d6a99c", "#dcdad8", "#ad6963", "#af6b6d", "#d7a39d", "#cca993", "#b7aca7", "#b6b9bd"]
    const windowColor = "#38455d"
    const materials = []
    buildingColors.forEach((it) => {
        materials.push(new THREE.MeshPhongMaterial({
            // vertexColors: THREE.FaceColors,
            flatShading: true,
            // depthWrite: false,
            shininess: 0,
            reflectivity: 0,
            color: new THREE.Color(it)
        }))
    })
    for (let i = 0; i < resolvedVertices.length; i++) {
        const coords = coordsFromIndex(i, width + 1)
        const point = resolvedVertices[i]
        const distanceFromCenter = Math.sqrt(Math.pow(point.x, 2) + Math.pow(point.y, 2))

        if (distanceFromCenter < ((Math.random() * 10) - 5) + Math.floor(width / citySize)) {
            if (isAboveWater(coords, resolvedVertices, width)) {
                continue
            }
            if (Math.round(Math.random() * 200) === 1) {
                let vertexDistance = 0
                let pointHeight = Math.random() * 20;
                let newPoint = new THREE.Vector4(point.x, point.y, pointHeight, i)
                const building = new Building(newPoint, scene, materials[Math.round(Math.random() * (materials.length - 1))])

                vertexDistance = Math.round(Math.abs(newPoint.z / 10))

                buildings.push(building)
            }
        }
        else {
            let slopeValue = Math.abs(distanceFromCenter - (Math.floor(width / citySize)))
            // if ((slopeValue * slopeMult) <= -2.89) {
            if (distanceFromCenter >= 500 + ((Math.random() * 4) - 2)) {
                slopeValue = -10
            }
            else {
                slopeValue *= slopeMult
                slopeValue += ((Math.random() * 2) - 1) * 0.1
            }
            if (point.z < 0) {
                continue
            }
            const newPoint = new THREE.Vector4(point.x, point.y, slopeValue, i)
            const sandColor = new THREE.Color("#C2B280")
            setColor(geometry, sandColor, i)
            setVertexPoint(geometry.attributes.position.array, newPoint, resolvedVertices)
        }
    }
    // rotateAboutPoint(mesh, new THREE.Vector3(), new THREE.Vector3(1.0, 0.0, 0.0), Math.PI * -90 / 180, true)
    return buildings
}

function buildRiver(geometry, resolvedVertices, width, citySize) {
    const riverWidth = 10
    const endErosion = 0.3;
    for (let x = 0; x < width ; x++) {
        const distanceFromCenter = Math.abs(x - (width / 2))

        let min = Math.floor(-riverWidth / 2)
        let max = Math.floor(riverWidth / 2)
        // if (distanceFromCenter > (Math.floor(width / citySize)) && !(inRange(x, width / 2 - 50, width / 2 + 50))) {
        //     // console.log(x)
        //     min -= Math.round((distanceFromCenter - Math.floor(width / citySize)) * endErosion * Math.random())
        //     max += Math.round((distanceFromCenter - Math.floor(width / citySize)) * endErosion * Math.random())
        // }
        for (let y = min; y < max; y++) {

            const index = indexFromCoords(x, Math.floor(width / 2) + y, width + 1)
            const point = resolvedVertices[index]
            if (!point) continue
            const coords = coordsFromIndex(index, width + 1)
            const newPoint = new THREE.Vector4(point.x, point.y, -10, index)
            setVertexPoint(geometry.attributes.position.array, newPoint, resolvedVertices)
        }
    }
}

function setVertexPoint(array, point, resolvedVertices) {
    if (resolvedVertices) {
        resolvedVertices[point.w] = point
    }
    const index = point.w * 3
    array[index] = point.x
    array[index + 1] = point.y
    array[index + 2] = point.z
}

let mesh

function setColor(geometry, color, index, findFriends) {
    geometry.attributes.color.setXYZ(index, color.r, color.g, color.b)
    if (findFriends) {
        for (let i = 0; i < geometry.index.count; i++) {
            if (geometry.index[i] === index) {
                const subIndex = i % 3;
                if (subIndex === 0) {
                    geometry.attributes.color.setXYZ(index + 1, color.r, color.g, color.b)
                    geometry.attributes.color.setXYZ(index + 2, color.r, color.g, color.b)
                }
                else if (subIndex === 1) {
                    geometry.attributes.color.setXYZ(index + 1, color.r, color.g, color.b)
                    geometry.attributes.color.setXYZ(index - 1, color.r, color.g, color.b)
                }
                else {
                    geometry.attributes.color.setXYZ(index - 1, color.r, color.g, color.b)
                    geometry.attributes.color.setXYZ(index - 2, color.r, color.g, color.b)
                }
            }
        }
    }
}

function inRange(value, min, max) {
    return ((value - min) * (value - max) <= 0);
}

function indexFromCoords(x, y, rowWidth = 513) {
    return (rowWidth * y) + x
}

function coordsFromIndex(index, rowWidth = 513) {
    return new THREE.Vector2(index % rowWidth, Math.floor(index / rowWidth))
}

class Island {
    constructor(type = 1, scene) {
        this.uniforms = {
            time: {type: 'f', value: 0},
            ucolor: {type: 'v3', value: new THREE.Vector3(1., 1., 1.)},
            uopacity: {type: 'f', value: 0.5}
        };
        this.scene = scene
        this.buildings = []
        this.mesh = this.createMesh(type);
        scene.add(this.mesh)
        this.mesh.rotation.x = Math.PI * 1.5
        mesh = this.mesh
        this.time = 1;
    }

    createMesh(type) {
        const width = 1024
        const citySize = 2.5;
        const geometry = new THREE.PlaneGeometry(width, width, width, width)
        const vertices = geometry.attributes.position.array
        let resolvedVertices = resolveVertices(geometry)
        const count = geometry.attributes.position.array.length;
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
        let color = new THREE.Color("#ffffff")
        // console.log(geometry.faces)

        for (let i = 0; i < geometry.attributes.color.array.length / 3; i++) {
            if (inRange(i, (geometry.attributes.color.array.length / 6) - 100, (geometry.attributes.color.array.length / 6) + 100)) {
                setColor(geometry, new THREE.Color(color.r, 0.0, color.b), i)
            }
            else {
                setColor(geometry, color, i)
            }
        }

        geometry.attributes.color.needsUpdate = true;
        buildRiver(geometry, resolvedVertices, width, citySize)
        this.buildings = buildBuildings(geometry, width, resolvedVertices, citySize, this.scene)
        // this.buildings.forEach((it) => {
        //     it.mesh.updateMatrix()
        //     geometry.merge()
        // })
        // const buildingMaterial = new THREE.MeshPhongMaterial({
        //     // vertexColors: THREE.FaceColors,
        //     flatShading: true,
        //     // depthWrite: false,
        //     color: 0xffff00,
        // })
        // const mesh = new THREE.Mesh(geometry, buildingMaterial)
        // let material = new THREE.RawShaderMaterial({
        //     uniforms: this.uniforms, vertexShader: vShader, fragmentShader: fShader, transparent: true
        // })

        let material = new THREE.MeshStandardMaterial({vertexColors: THREE.VertexColors})
        material.depthWrite = true;
        material.flatShading = true

        if (type === 0) {
            material = new THREE.LineBasicMaterial({color: 0xffffff})
            return new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material)
        }

        else if (type === 1) {
            const planeMesh = new THREE.Mesh(geometry, material)
            planeMesh.renderOrder = 0
            planeMesh.receiveShadow = true;
            // planeMesh.castShadow = true;

            return planeMesh
        }
        else {
            return new THREE.Points(geometry)
        }
    }

    render(time) {
        this.uniforms.time.value += time * this.time;
    }
}

function rotateAboutPoint(obj, point, axis, theta, pointIsWorld) {
    pointIsWorld = (pointIsWorld === undefined) ? false : pointIsWorld;

    if (pointIsWorld) {
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if (pointIsWorld) {
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

export {Island, rotateAboutPoint, Building}
