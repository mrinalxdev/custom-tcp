import React, { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import "@tensorflow/tfjs-backend-webgl";
import * as THREE from "three";
import * as mathjs from "mathjs";
import { Camera, Hand, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const App = () => {
  const [equation, setEquation] = useState("sin(x) * cos(z)");
  const [error, setError] = useState("");
  const [handposeModel, setHandposeModel] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [graphColor, setGraphColor] = useState("#4287f5");
  const [wireframe, setWireframe] = useState(false);
  const [isHandDetected, setIsHandDetected] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const graphRef = useRef(null);
  const controlsRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastPalmPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.5;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4287f5, 0.5);
    pointLight1.position.set(-5, 5, -5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff0000, 0.5);
    pointLight2.position.set(5, -5, 5);
    scene.add(pointLight2);

    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    generateGraph();

    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  const generateGraph = () => {
    if (!sceneRef.current) return;

    if (graphRef.current) {
      sceneRef.current.remove(graphRef.current);
    }

    try {
      const compiledEquation = mathjs.compile(equation);
      const geometry = new THREE.BufferGeometry();
      const resolution = 100;
      const size = 5;

      const vertices = [];
      const colors = [];

      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const x = (i / (resolution - 1)) * size * 2 - size;
          const z = (j / (resolution - 1)) * size * 2 - size;
          const y = compiledEquation.evaluate({ x, z });

          vertices.push(x, y, z);

          const hue = (y + size) / (size * 2);
          const color = new THREE.Color().setHSL(hue, 0.7, 0.5);
          colors.push(color.r, color.g, color.b);
        }
      }

      const indices = [];
      for (let i = 0; i < resolution - 1; i++) {
        for (let j = 0; j < resolution - 1; j++) {
          const a = i * resolution + j;
          const b = a + 1;
          const c = (i + 1) * resolution + j;
          const d = c + 1;
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(graphColor),
        wireframe,
        side: THREE.DoubleSide,
        metalness: 0.5,
        roughness: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      graphRef.current = mesh;
      sceneRef.current.add(mesh);
      setError("");
    } catch (err) {
      setError(`Invalid equation: ${err.message}`);
    }
  };

  // todo : Load Handpose model
  useEffect(() => {
    const loadModel = async () => {
      setLoading(true);
      try {
        await tf.setBackend("webgl");
        const model = await handpose.load();
        setHandposeModel(model);
        setLoading(false);
      } catch (error) {
        console.error("Error loading handpose model:", error);
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    if (cameraEnabled && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: "user",
          },
        })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          setCameraEnabled(false);
        });

      return () => {
        const stream = videoRef.current?.srcObject;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      };
    }
  }, [cameraEnabled]);

  // Hand detection loop
  useEffect(() => {
    let detectInterval;

    const runHandDetection = async () => {
      if (!handposeModel || !videoRef.current || !cameraEnabled) return;

      try {
        const predictions = await handposeModel.estimateHands(videoRef.current);
        setIsHandDetected(predictions.length > 0);

        if (predictions.length > 0 && controlsRef.current) {
          const hand = predictions[0];
          const palmBase = hand.landmarks[0];
          const indexTip = hand.landmarks[8];
          const thumbTip = hand.landmarks[4];

          const deltaX = palmBase[0] - lastPalmPosition.current.x;
          const deltaY = palmBase[1] - lastPalmPosition.current.y;

          lastPalmPosition.current = { x: palmBase[0], y: palmBase[1] };

          const pinchDistance = Math.sqrt(
            Math.pow(thumbTip[0] - indexTip[0], 2) +
              Math.pow(thumbTip[1] - indexTip[1], 2)
          );

          if (Math.abs(deltaX) > 1) {
            controlsRef.current.rotateLeft(deltaX * 0.002);
          }
          if (Math.abs(deltaY) > 1) {
            controlsRef.current.rotateUp(deltaY * 0.002);
          }
          if (pinchDistance < 40) {
            controlsRef.current.dollyIn(1.02);
          } else if (pinchDistance > 100) {
            controlsRef.current.dollyOut(1.02);
          }

          controlsRef.current.update();
        }
      } catch (error) {
        console.error("Error in hand detection:", error);
      }
    };

    if (cameraEnabled) {
      detectInterval = setInterval(runHandDetection, 50); // Run detection every 50ms
    }

    return () => {
      if (detectInterval) {
        clearInterval(detectInterval);
      }
    };
  }, [cameraEnabled, handposeModel]);

  useEffect(() => {
    generateGraph();
  }, [equation, graphColor, wireframe]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(5, 5, 5);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    }
  };

  return (
    <div className="w-full h-screen bg-gray-900 text-white relative">
      {/* Controls Panel */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 z-10 bg-gray-800/90 p-6 rounded-lg shadow-xl backdrop-blur-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium">Equation:</label>
            <input
              type="text"
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              className="w-64 px-3 py-2 bg-gray-700 rounded text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="e.g. sin(x) * cos(z)"
            />
            {error && <div className="text-red-500 mt-2 text-sm">{error}</div>}
          </div>

          <div>
            <label className="block mb-2 font-medium">Graph Color:</label>
            <input
              type="color"
              value={graphColor}
              onChange={(e) => setGraphColor(e.target.value)}
              className="w-full h-8 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wireframe"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="wireframe">Wireframe Mode</label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              {cameraEnabled ? (
                <Camera className="w-4 h-4" />
              ) : (
                <Hand className="w-4 h-4" />
              )}
              {cameraEnabled ? "Disable" : "Enable"} Hand Controls
            </button>

            <button
              onClick={resetCamera}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset View
            </button>
          </div>

          {loading && (
            <div className="text-blue-400">Loading hand detection model...</div>
          )}

          {cameraEnabled && (
            <div
              className={`text-sm ${
                isHandDetected ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {isHandDetected ? "Hand detected" : "No hand detected"}
            </div>
          )}
        </div>
      </motion.div>

      {/* Three.js Canvas */}
      <div ref={canvasRef} className="w-full h-full" />

      {/* Camera Feed */}
      {cameraEnabled && (
        <div className="absolute bottom-4 right-4 w-64 h-48 bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        </div>
      )}
    </div>
  );
};

export default App;
