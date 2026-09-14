import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.getElementById('rack3d');
const wrap=document.getElementById('rack3dWrap');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0xf8f6f1);
const camera=new THREE.PerspectiveCamera(38,1,1,50000);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;
controls.dampingFactor=.08;
controls.enablePan=false;
controls.minPolarAngle=.2;
controls.maxPolarAngle=Math.PI/2-.02;
controls.rotateSpeed=.75;
controls.zoomSpeed=.8;

scene.add(new THREE.HemisphereLight(0xffffff,0x776f62,2.1));
const key=new THREE.DirectionalLight(0xffffff,3.1);
key.position.set(-1800,2600,2200);
key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
scene.add(key);
const fill=new THREE.DirectionalLight(0xfff4dc,1.1);
fill.position.set(2200,1200,-1800);
scene.add(fill);

const rack=new THREE.Group();
scene.add(rack);
const floorMat=new THREE.MeshStandardMaterial({color:0xe9e5dc,roughness:1,metalness:0,transparent:true,opacity:.8});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(10000,10000),floorMat);
floor.rotation.x=-Math.PI/2;
floor.receiveShadow=true;
scene.add(floor);

const mats={
  post:new THREE.MeshStandardMaterial({color:0xb79a68,roughness:.82}),
  rail:new THREE.MeshStandardMaterial({color:0xc5aa78,roughness:.82}),
  brace:new THREE.MeshStandardMaterial({color:0xa98955,roughness:.82}),
  top:new THREE.MeshStandardMaterial({color:0xd0b98c,roughness:.78})
};
const edgeMat=new THREE.LineBasicMaterial({color:0x6f5b3a,transparent:true,opacity:.62});

function clearRack(){
  while(rack.children.length){
    const o=rack.children.pop();
    o.geometry?.dispose();
    o.children?.forEach(c=>c.geometry?.dispose());
  }
}
function beam(x,y,z,w,h,d,type='rail'){
  const geo=new THREE.BoxGeometry(Math.max(.1,w),Math.max(.1,h),Math.max(.1,d));
  const mesh=new THREE.Mesh(geo,mats[type] || mats.rail);
  mesh.position.set(x+w/2,y+h/2,z+d/2);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),edgeMat);
  mesh.add(edges);
  rack.add(mesh);
}
function fitCamera(cfg,resetAngle=false){
  const {W,H,D}=cfg;
  const target=new THREE.Vector3(W/2,H*.42,D/2);
  const oldTarget=controls.target.clone();
  const oldDir=camera.position.clone().sub(oldTarget).normalize();
  controls.target.copy(target);
  const diag=Math.hypot(W,H,D);
  const dist=diag*1.25;
  if(resetAngle || !camera.userData.positioned){
    camera.position.set(W/2 + dist*.9, H*.5 + dist*.55, D/2 + dist*.95);
    camera.userData.positioned=true;
  } else {
    camera.position.copy(target.clone().add(oldDir.multiplyScalar(dist)));
  }
  camera.near=Math.max(1,diag/1000);
  camera.far=diag*20;
  camera.updateProjectionMatrix();
  controls.update();
}

window.updateRack3D=function(cfg){
  clearRack();
  const {W,H,D,cols,rows,uW,uD,rW,rH,binW,binD,binH,gapX,gapY,gapD,bottom}=cfg;
  const clearD=binD+gapD;
  const zFront=rH;
  const zRear=D-rH-uD;
  const runnerD=D-2*rH;

  for(let c=0;c<=cols;c++){
    const x=c*(binW+gapX+uW);
    beam(x,0,zFront,uW,H,uD,'post');
    beam(x,0,zRear,uW,H,uD,'post');
  }

  // Deux glissières porteuses par caisse. Elles longent les faces intérieures
  // des montants avant et arrière, pour pouvoir être vissées dans les montants.
  for(let r=0;r<rows;r++){
    const y=Math.max(0,bottom+r*(binH+gapY)-rH);
    for(let c=0;c<cols;c++){
      const leftPostX=c*(binW+gapX+uW);
      const rightPostX=(c+1)*(binW+gapX+uW);
      beam(leftPostX+uW,y,zFront,rW,rH,runnerD,'rail');
      beam(rightPostX-rW,y,zFront,rW,rH,runnerD,'rail');
    }
  }

  beam(0,0,0,W,rH,rH,'brace');
  beam(0,0,D-rH,W,rH,rH,'brace');
  beam(0,H-rH,0,W,rH,rH,'brace');
  beam(0,H-rH,D-rH,W,rH,rH,'brace');

  for(let c=0;c<=cols;c++){
    const postX=c*(binW+gapX+uW);
    beam(postX+(uW-rW)/2,H-rH,rH+uD,rW,rH,clearD,'top');
  }

  floor.position.y=-1;
  fitCamera(cfg,false);
};

function resize(){
  const rect=wrap.getBoundingClientRect();
  const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();
if(window.rack3DLastConfig) window.updateRack3D(window.rack3DLastConfig);

function animate(){
  controls.update();
  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();
