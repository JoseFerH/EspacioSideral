import * as THREE from 'three';

export const planetData = {
    sun: {
        radius: 10,
        distance: 0,
        color: 0xffea00,
        name: 'Sol',
        fontClass: 'font-elegante',
        text: [
            "El Sol es el motor de gravedad que lo mueve todo,",
            "del mismo modo en que tú has sido el motor",
            "que me motiva a mejorar cada día."
        ]
    },
    mercury: {
        name: 'Mercurio',
        radius: 0.5,
        distance: 15,
        speed: 0.04,
        color: 0xaaaaaa,
        fontClass: 'font-minimalista',
        text: [
            "Al ser el planeta más rápido y cercano al Sol,",
            "es el más atraído hacia él;",
            "su velocidad es lo único que evita",
            "que caiga en su interior."
        ]
    },
    venus: {
        name: 'Venus',
        radius: 1.2,
        distance: 22,
        speed: 0.015,
        color: 0xff9900,
        fontClass: 'font-elegante',
        text: [
            "Es el planeta más caliente.",
            "A pesar de no ser el más cercano al Sol,",
            "su atmósfera lo convierte en",
            "el más afectado por el calor."
        ]
    },
    earth: {
        name: 'Tierra',
        radius: 1.25,
        distance: 30,
        speed: 0.01,
        color: 0x00aaff,
        fontClass: 'font-minimalista',
        text: [
            "¿Sabías que hay más de 8,200 millones",
            "de personas en el mundo?",
            "Aun así, tuve la suerte de conocerte.",
            "Qué curioso, ¿verdad?"
        ]
    },
    mars: {
        name: 'Marte',
        radius: 0.6,
        distance: 40,
        speed: 0.008,
        color: 0xff3300,
        fontClass: 'font-robotica',
        text: [
            "Representa la esperanza para la humanidad:",
            "un segundo hogar.",
            "No sé tú, pero yo sí creo que somos capaces",
            "de llegar a Marte."
        ]
    },
    jupiter: {
        name: 'Júpiter',
        radius: 4,
        distance: 55,
        speed: 0.002,
        color: 0xffcc88,
        fontClass: 'font-elegante',
        text: [
            "Es tan grande que en su interior",
            "caben 1,300 Tierras. ¡Wow!",
            "Imagina a 1,300 Sarinas",
            "compitiendo entre sí."
        ]
    },
    saturn: {
        name: 'Saturno',
        radius: 3.5,
        distance: 75,
        speed: 0.0009,
        color: 0xffeebb,
        fontClass: 'font-elegante',
        text: [
            "Se siente muy especial por sus",
            "anillos de hielo y roca.",
            "Si los planetas fueran un grupo de amigos,",
            "¿quién crees que le dio los anillos?"
        ]
    },
    uranus: {
        name: 'Urano',
        radius: 2,
        distance: 95,
        speed: 0.0004,
        color: 0x00ffff,
        fontClass: 'font-scifi',
        text: [
            "Parece que va un poco tomado",
            "(quizás por tanto vino), porque rota totalmente de lado;",
            "su eje tiene una inclinación de casi 90°."
        ]
    },
    neptune: {
        name: 'Neptuno',
        radius: 1.9,
        distance: 110,
        speed: 0.0001,
        color: 0x0055ff,
        fontClass: 'font-minimalista',
        text: [
            "Es el más lejano, frío y oscuro,",
            "como el corazón de algunas personas.",
            "¿Se sentirá solo al estar a tanta",
            "distancia de los demás?"
        ]
    }
};

export class PlanetFactory {
    constructor() {
        this.textureLoader = new THREE.TextureLoader();
        // Generador procedural de ruido
        this.canvasNoise = document.createElement('canvas');
        this.canvasNoise.width = 1024;
        this.canvasNoise.height = 512;
    }

    generateProceduralTextures(colorHex, isGasGiant = false) {
        const ctx = this.canvasNoise.getContext('2d');
        const width = this.canvasNoise.width;
        const height = this.canvasNoise.height;

        const baseCanvas = document.createElement('canvas');
        baseCanvas.width = width; baseCanvas.height = height;
        const baseCtx = baseCanvas.getContext('2d');

        const normalCanvas = document.createElement('canvas');
        normalCanvas.width = width; normalCanvas.height = height;
        const normalCtx = normalCanvas.getContext('2d');

        const roughCanvas = document.createElement('canvas');
        roughCanvas.width = width; roughCanvas.height = height;
        const roughCtx = roughCanvas.getContext('2d');

        const baseColor = new THREE.Color(colorHex);

        // Simulación básica de ruido/bandas para planetas
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;

                let noiseVal = Math.random();
                if (isGasGiant) {
                    // Bandas ecuatoriales para gigantes gaseosos
                    const band = Math.sin(y * 0.05) * 0.5 + 0.5;
                    noiseVal = noiseVal * 0.2 + band * 0.8;
                } else {
                    // Craters / continentes (baja frecuencia simulada superponiendo ruido)
                    const sf = Math.sin(x*0.02)*Math.cos(y*0.02);
                    noiseVal = (noiseVal * 0.4) + (sf * 0.6);
                }

                // Base
                const intensity = 0.5 + noiseVal * 0.5;
                data[i] = baseColor.r * 255 * intensity;
                data[i+1] = baseColor.g * 255 * intensity;
                data[i+2] = baseColor.b * 255 * intensity;
                data[i+3] = 255;
            }
        }
        baseCtx.putImageData(imageData, 0, 0);

        // Normal Map (basado en el ruido)
        const nData = normalCtx.createImageData(width, height);
        for(let i=0; i<data.length; i+=4){
            // Simplificación: usando intensidad como relieve
            const bump = isGasGiant ? 128 : (data[i] / 255) * 128 + 128;
            nData[i] = 128; // R (X)
            nData[i+1] = 128; // G (Y)
            nData[i+2] = bump; // B (Z)
            nData[i+3] = 255;
        }
        normalCtx.putImageData(nData, 0, 0);

        // Roughness Map
        const rData = roughCtx.createImageData(width, height);
        for(let i=0; i<data.length; i+=4){
            const rough = isGasGiant ? 50 : 200 - (data[i]/255)*100;
            rData[i] = rData[i+1] = rData[i+2] = rough;
            rData[i+3] = 255;
        }
        roughCtx.putImageData(rData, 0, 0);

        return {
            map: new THREE.CanvasTexture(baseCanvas),
            normalMap: new THREE.CanvasTexture(normalCanvas),
            roughnessMap: new THREE.CanvasTexture(roughCanvas)
        };
    }

    createPlanet(key) {
        const data = planetData[key];
        const isGasGiant = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(key);

        const geometry = new THREE.SphereGeometry(data.radius, 64, 64);

        let material;
        if (key === 'sun') {
            material = new THREE.MeshBasicMaterial({
                color: data.color
            });
        } else {
            const textures = this.generateProceduralTextures(data.color, isGasGiant);
            material = new THREE.MeshStandardMaterial({
                map: textures.map,
                normalMap: textures.normalMap,
                roughnessMap: textures.roughnessMap,
                metalness: 0.1
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = { ...data, isPlanet: key !== 'sun', id: key };

        // Atmosphere (Fresnel Shader)
        if (key !== 'sun') {
            const atmosGeo = new THREE.SphereGeometry(data.radius * 1.02, 64, 64);
            const atmosMat = new THREE.ShaderMaterial({
                uniforms: {
                    c: { type: "f", value: 0.3 },
                    p: { type: "f", value: 4.0 },
                    glowColor: { type: "c", value: new THREE.Color(data.color) }
                },
                vertexShader: `
                    uniform float c;
                    uniform float p;
                    varying float intensity;
                    void main() {
                        vec3 vNormal = normalize( normalMatrix * normal );
                        vec3 vNormel = normalize( normalMatrix * viewVector );
                        intensity = pow( c - dot(vNormal, vNormel), p );
                        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    varying float intensity;
                    void main() {
                        vec3 glow = glowColor * intensity;
                        gl_FragColor = vec4( glow, intensity );
                    }
                `,
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false
            });
            // Añadir variable viewVector al vertex shader, calculada en SceneManager
            atmosMat.onBeforeCompile = (shader) => {
                shader.uniforms.viewVector = { value: new THREE.Vector3() };
                shader.vertexShader = `uniform vec3 viewVector;\n` + shader.vertexShader;
                mesh.userData.atmosUniforms = shader.uniforms;
            };

            const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
            atmosMesh.visible = false; // Solo visible en zoom
            mesh.add(atmosMesh);
            mesh.userData.atmosphere = atmosMesh;
        }

        // Grupo contenedor para rotación y traslación
        const group = new THREE.Group();
        group.add(mesh);

        // Offset de la órbita (traslación)
        mesh.position.x = data.distance;

        // Añadir línea de órbita visual (opcional, ayuda a la UI)
        if (key !== 'sun') {
            const orbitGeo = new THREE.RingGeometry(data.distance - 0.05, data.distance + 0.05, 128);
            const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
            const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
            orbitMesh.rotation.x = Math.PI / 2;
            group.add(orbitMesh);
        }

        return group;
    }
}
