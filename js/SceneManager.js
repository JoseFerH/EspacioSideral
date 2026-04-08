import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneManager {
    constructor(canvasContainer) {
        this.container = canvasContainer;
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 40, 150); // Initial far view

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); // Dim ambient
        this.scene.add(ambientLight);

        // PointLight inside the Sun (position 0,0,0)
        this.sunLight = new THREE.PointLight(0xffffff, 3, 300);
        this.scene.add(this.sunLight);

        this.planets = [];
        this.stars = null;

        // State
        this.isWarping = true;
        this.currentZoomedPlanet = null;

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 600;
        // Desactivar controles durante la animación de warp
        this.controls.enabled = false;

        this.initPostProcessing();
        this.initStars();

        // Listeners for interaction
        window.addEventListener('click', this.onMouseClick.bind(this));
    }

    onMouseClick(event) {
        if (this.isWarping) return;

        // Ignorar clics en UI
        if (event.target.id === 'back-button' || event.target.closest('#planet-info')) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Buscar intersecciones con los meshes de los planetas y el sol
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        for (let i = 0; i < intersects.length; i++) {
            const object = intersects[i].object;
            // Aceptar cualquier objeto que tenga un 'id' en userData (planetas o sol)
            if (object.userData && object.userData.id) {
                // Ignore if we are clicking on the exact planet we are currently zoomed into
                if (this.currentZoomedPlanet === object) break;

                this.zoomToPlanet(object);
                break;
            }
        }
    }

    zoomToPlanet(planetMesh) {
        // Si ya hay un planeta zoomeado, desactivamos su atmósfera primero
        if (this.currentZoomedPlanet && this.currentZoomedPlanet.userData.atmosphere) {
            this.currentZoomedPlanet.userData.atmosphere.visible = false;
        }

        this.currentZoomedPlanet = planetMesh;

        // Activar atmósfera del nuevo planeta
        if (planetMesh.userData.atmosphere) {
            planetMesh.userData.atmosphere.visible = true;
        }

        // Emitir evento para UI y Audio
        window.dispatchEvent(new CustomEvent('planetZoom', { detail: planetMesh.userData }));

        // Calcular posición objetivo (frente al planeta y ligeramente arriba)
        const planetWorldPos = new THREE.Vector3();
        planetMesh.getWorldPosition(planetWorldPos);

        const radius = planetMesh.geometry.parameters.radius;
        const targetPos = new THREE.Vector3(
            planetWorldPos.x + radius * 3,
            planetWorldPos.y + radius,
            planetWorldPos.z + radius * 3
        );

        // Desactivar controles interactivos durante el zoom
        this.controls.enabled = false;

        // Animar cámara hacia el planeta
        gsap.to(this.camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(planetWorldPos);
            },
            onComplete: () => {
                // Al finalizar la animación, actualizar el target de los controles
                this.controls.target.copy(planetWorldPos);
                this.controls.enabled = true; // Reactivar controles alrededor del planeta

                // Restringir el zoom y paneo mientras se observa el planeta
                this.controls.minDistance = radius * 1.5;
                this.controls.maxDistance = radius * 10;
            }
        });
    }

    zoomOut() {
        if (!this.currentZoomedPlanet) return;

        // Desactivar atmósfera
        if (this.currentZoomedPlanet.userData.atmosphere) {
            this.currentZoomedPlanet.userData.atmosphere.visible = false;
        }

        this.currentZoomedPlanet = null;

        // Emitir evento para UI y Audio
        window.dispatchEvent(new CustomEvent('planetZoomOut'));

        // Desactivar controles durante la animación
        this.controls.enabled = false;

        // Animar el target de los controles de vuelta al centro
        gsap.to(this.controls.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 2,
            ease: "power2.inOut"
        });

        // Volver a posición global
        gsap.to(this.camera.position, {
            x: 0,
            y: 80,
            z: 200,
            duration: 2,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.lookAt(0, 0, 0);
            },
            onComplete: () => {
                this.controls.enabled = true; // Reactivar controles
                // Restaurar restricciones globales
                this.controls.minDistance = 0;
                this.controls.maxDistance = 600;
            }
        });
    }

    updatePlanets(time) {
        // En lugar de iterar this.planets, iteramos sobre los objetos en la escena
        this.scene.children.forEach(group => {
            if (group.type === 'Group' && group.children.length > 0) {
                const mesh = group.children[0];
                if (mesh.userData && mesh.userData.id) {
                    const data = mesh.userData;

                    // Rotación sobre sí mismo
                    mesh.rotation.y += 0.01;

                    // Traslación (órbita)
                    if (data.id !== 'sun' && !this.currentZoomedPlanet) {
                        // Órbita elíptica simple: x = cos, z = sin
                        // Asumimos que mesh.position.x fue seteado inicialmente como distancia
                        group.rotation.y += data.speed;
                    }

                    // Actualizar uniforms de atmósfera
                    if (mesh.userData.atmosphere && mesh.userData.atmosphere.visible && mesh.userData.atmosUniforms) {
                        const viewVector = new THREE.Vector3().subVectors(this.camera.position, mesh.getWorldPosition(new THREE.Vector3()));
                        mesh.userData.atmosUniforms.viewVector.value.copy(viewVector);
                    }
                }
            }
        });
    }

    initStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 5000;
        const posArray = new Float32Array(starCount * 3);

        for(let i=0;i<starCount*3;i++) {
            // Rango -500 a 500
            posArray[i] = (Math.random() - 0.5) * 1000;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

        // Material para las estrellas (warp effect estirado)
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            transparent: true,
            opacity: 1
        });

        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }

    startWarpIntro(onComplete) {
        this.isWarping = true;

        // Aumentar FOV para efecto de velocidad
        gsap.to(this.camera, {
            fov: 120,
            duration: 1.5,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut",
            onUpdate: () => {
                this.camera.updateProjectionMatrix();
            }
        });

        // Estirar estrellas en Z para simular warp y mover la cámara hacia adelante
        // Luego volver a la normalidad
        gsap.to(this.stars.scale, {
            z: 50,
            duration: 1.5,
            yoyo: true,
            repeat: 1,
            ease: "power2.in"
        });

        // Tras 3 segundos, finalizar intro
        setTimeout(() => {
            this.isWarping = false;
            // Restaurar FOV y posición final para vista del sistema solar
            gsap.to(this.camera, {
                fov: 75,
                duration: 1,
                onUpdate: () => this.camera.updateProjectionMatrix()
            });
            gsap.to(this.camera.position, {
                x: 0,
                y: 80,
                z: 200,
                duration: 2,
                ease: "power2.out",
                onComplete: onComplete
            });
            // Ocultar o atenuar el warp estirado, volver a puntos normales
            gsap.to(this.stars.scale, {
                z: 1,
                duration: 1
            });

            // Habilitar controles
            this.controls.enabled = true;
        }, 3000);
    }

    initPostProcessing() {
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5, // strength
            0.4, // radius
            0.85 // threshold
        );

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
    }

    render(time) {
        if (this.isWarping && this.stars) {
            // Mover las estrellas hacia la cámara en el eje Z durante el warp
            this.stars.position.z += 2;
            if (this.stars.position.z > 200) {
                this.stars.position.z = 0;
            }
        } else if (this.stars) {
            // Rotación lenta normal del fondo estelar
            this.stars.rotation.y += 0.0002;
        }

        // Actualizar planetas
        this.updatePlanets(time);

        // Update controls
        if (this.controls.enabled) {
            this.controls.update();
        }

        // Si estamos en zoom y la cámara de animación ha terminado (controls.enabled === true),
        // mantenemos el target de los controles en la posición del planeta.
        if (this.currentZoomedPlanet && this.controls.enabled) {
            const planetWorldPos = new THREE.Vector3();
            this.currentZoomedPlanet.getWorldPosition(planetWorldPos);
            this.controls.target.copy(planetWorldPos);
        }

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }
}
