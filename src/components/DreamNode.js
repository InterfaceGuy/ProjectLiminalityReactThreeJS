import React from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';
import DreamTalk from './DreamTalk';
import DreamSong from './DreamSong';

class DreamNode {
  constructor({ scene, position = new THREE.Vector3(0, 0, 0) }) {
    this.scene = scene;
    this.position = position;
    this.object = new THREE.Object3D();
    this.isRotating = false;
    this.targetRotation = 0;

    this.init();
  }

  init() {
    console.log("Initializing DreamNode");
    this.createNode();
    this.addClickListener();
    console.log("DreamNode initialized");
  }

  createNode() {
    const radius = 2;
    const segments = 64;

    // Create a circular disc
    const geometry = new THREE.CircleGeometry(radius, segments);
    const material = new THREE.MeshBasicMaterial({ color: 0x4287f5, side: THREE.DoubleSide });
    const disc = new THREE.Mesh(geometry, material);
    disc.position.copy(this.position);

    const frontSide = this.createSide(DreamTalk, 0.01);
    const backSide = this.createSide(DreamSong, -0.01);
    backSide.rotation.y = Math.PI;

    this.object.add(disc);
    this.object.add(frontSide);
    this.object.add(backSide);
  }

  createSide(Component, zOffset) {
    const div = document.createElement('div');
    div.style.width = '400px';
    div.style.height = '400px';
    div.style.borderRadius = '50%';
    div.style.overflow = 'hidden';

    const root = createRoot(div);
    root.render(React.createElement(Component));

    const object = new CSS3DObject(div);
    object.position.set(0, 0, zOffset);
    object.scale.set(0.01, 0.01, 0.01);

    return object;
  }

  addClickListener() {
    this.object.userData.clickable = true;
    this.scene.addEventListener('click', this.onNodeClick.bind(this));
  }

  onNodeClick(event) {
    const intersects = event.intersects;
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.parent === this.object && !this.isRotating) {
        this.rotateNode();
      }
    }
  }

  rotateNode() {
    this.isRotating = true;
    this.targetRotation = this.object.rotation.y + Math.PI;
  }

  update() {
    if (this.isRotating) {
      const rotationSpeed = 0.1;
      this.object.rotation.y += rotationSpeed;
      if (Math.abs(this.object.rotation.y - this.targetRotation) < 0.1) {
        this.object.rotation.y = this.targetRotation;
        this.isRotating = false;
      }
    }
  }

  getObject() {
    return this.object;
  }
}

export default DreamNode;
