import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { PlanetFactory, planetData } from './PlanetFactory.js';
import { AudioManager } from './AudioManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.getElementById('canvas-container');
    const backButton = document.getElementById('back-button');
    const planetInfo = document.getElementById('planet-info');
    const planetName = document.getElementById('planet-name');
    const planetDescription = document.getElementById('planet-description');

    // Tutorial elements
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const tutMove = document.getElementById('tut-move');
    const tutTap = document.getElementById('tut-tap');
    let tutorialState = 0; // 0: hidden, 1: showing move, 2: showing tap, 3: completed

    // Initialize core systems
    const sceneManager = new SceneManager(canvasContainer);
    const planetFactory = new PlanetFactory();
    const audioManager = new AudioManager();

    // Populate scene with planets
    const planetKeys = Object.keys(planetData);
    planetKeys.forEach(key => {
        const planetGroup = planetFactory.createPlanet(key);
        sceneManager.scene.add(planetGroup);
    });

    // Handle Start Screen
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-button');
    let audioInitialized = false;

    startButton.addEventListener('click', () => {
        // Initialize Audio context on user gesture
        audioManager.init();
        audioManager.playBackgroundMusic();
        audioInitialized = true;

        // Fade out and remove start screen
        gsap.to(startScreen, {
            opacity: 0,
            duration: 1,
            onComplete: () => {
                startScreen.style.display = 'none';
            }
        });

        // Immediately start Warp Intro
        sceneManager.startWarpIntro(() => {
            // Callback when intro finishes
            console.log("Warp Intro Complete. System ready.");
            audioManager.playWhoosh(1.5);

            // Mostrar primer paso del tutorial (mover)
            if (tutorialState === 0) {
                tutorialState = 1;
                tutorialOverlay.classList.remove('hidden');
                gsap.to(tutorialOverlay, { opacity: 1, duration: 1, delay: 0.5 });

                // Listen for first interaction to switch to 'tap' step
                sceneManager.controls.addEventListener('start', onFirstInteraction);
            }
        });
    });

    function onFirstInteraction() {
        if (tutorialState === 1) {
            tutorialState = 2;
            sceneManager.controls.removeEventListener('start', onFirstInteraction);

            // Transición suave entre tutoriales
            gsap.to(tutorialOverlay, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                    tutMove.classList.add('hidden');
                    tutTap.classList.remove('hidden');
                    gsap.to(tutorialOverlay, { opacity: 1, duration: 0.5 });
                }
            });
        }
    }

    // Ensure THREE is globally available in main script scope just in case needed by modules
    window.THREE = THREE;

    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();
        sceneManager.render(elapsedTime);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        sceneManager.resize(window.innerWidth, window.innerHeight);
    });

    // UI and Audio Event Listeners from SceneManager
    window.addEventListener('planetZoom', (event) => {
        // Completar tutorial si todavía estaba activo
        if (tutorialState < 3) {
            tutorialState = 3;
            gsap.to(tutorialOverlay, {
                opacity: 0,
                duration: 0.5,
                onComplete: () => tutorialOverlay.classList.add('hidden')
            });
        }

        const data = event.detail;

        // Update Audio
        if (audioInitialized) {
            audioManager.playWhoosh(1.0);
            audioManager.setZoomMode(true);
            setTimeout(() => audioManager.playElectronicPulse(), 1000);
        }

        // Fade out existing info if visible, then swap data and fade back in
        const updateUIContent = () => {
            // Show Back Button
            backButton.classList.remove('hidden');

            planetName.textContent = data.name;

            // Clear previous description and classes
            planetDescription.innerHTML = '';
            planetInfo.className = ''; // reset

            // Apply specific typography
            if (data.fontClass) {
                planetInfo.classList.add(data.fontClass);
            }

            // Apply border color dynamically
            const hexColor = '#' + new THREE.Color(data.color).getHexString();
            planetInfo.style.borderLeftColor = hexColor;

            // Build HTML for text
            data.text.forEach(line => {
                const p = document.createElement('p');
                p.className = 'description-line';
                p.textContent = line;
                planetDescription.appendChild(p);
            });

            // Show UI via GSAP
            planetInfo.classList.remove('hidden');
            gsap.to(planetInfo, {
                opacity: 1,
                y: 0,
                duration: 1,
                delay: 0.5,
                ease: "power2.out"
            });
        };

        if (!planetInfo.classList.contains('hidden') && planetInfo.style.opacity > 0) {
            // UI is already visible (jumping from planet to planet)
            gsap.to(planetInfo, {
                opacity: 0,
                y: 20,
                duration: 0.3,
                ease: "power2.in",
                onComplete: updateUIContent
            });
        } else {
            // UI is hidden
            updateUIContent();
        }
    });

    window.addEventListener('planetZoomOut', () => {
        // Hide Back Button
        backButton.classList.add('hidden');

        // Update Audio
        if (audioInitialized) {
            audioManager.playWhoosh(1.0);
            audioManager.setZoomMode(false);
        }

        // Hide UI via GSAP
        gsap.to(planetInfo, {
            opacity: 0,
            y: 20,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
                planetInfo.classList.add('hidden');
            }
        });
    });

    // Back Button Click Handler
    backButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el raycaster lo detecte como click en el espacio vacío
        sceneManager.zoomOut();
    });

    // Easter Egg Event Listener
    const easterEgg = document.getElementById('easter-egg');
    const easterEggBack = document.getElementById('easter-egg-back');

    window.addEventListener('easterEggTrigger', () => {
        if (easterEgg.classList.contains('hidden')) {
            easterEgg.classList.remove('hidden');
            gsap.to(easterEgg, { opacity: 1, duration: 1.5, ease: "power2.inOut" });

            // Ocultar la UI normal y pausar controles temporalmente
            sceneManager.controls.enabled = false;
        }
    });

    easterEggBack.addEventListener('click', () => {
        gsap.to(easterEgg, {
            opacity: 0,
            duration: 1,
            onComplete: () => {
                easterEgg.classList.add('hidden');

                // Reposicionar la cámara más cerca
                gsap.to(sceneManager.camera.position, {
                    x: 0,
                    y: 80,
                    z: 200,
                    duration: 2,
                    ease: "power2.out",
                    onComplete: () => {
                        sceneManager.controls.enabled = true;
                    }
                });
            }
        });
    });

    // Notify user to interact for audio
    console.log("Click anywhere to enable audio and interact with planets.");
});
