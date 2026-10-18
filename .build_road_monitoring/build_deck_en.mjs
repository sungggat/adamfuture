import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const SKILL_DIR = "/Users/sunggat/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const workspaceDir = "/Users/sunggat/Documents/ADAM";
const TMP_DIR = path.join(workspaceDir, ".build_road_monitoring_en");
const FINAL_PPTX = path.join(workspaceDir, "output", "PhD_Seminar_Intelligent_Road_Infrastructure_Monitoring_EN_final.pptx");
const RUNTIME_PYTHON = "/Users/sunggat/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const { makeNativeBulletParagraphs, applyPresentationChartFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs")).href,
);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const W = 1280, H = 720, FONT = "Arial";
const C = { navy:"#071926", navy2:"#0D2A3C", cyan:"#18C7D8", cyan2:"#8DE9F0", amber:"#F5A623", red:"#E85D5D", green:"#4CC38A", white:"#F7FAFC", paper:"#F4F7F8", ink:"#102A3A", muted:"#557080", line:"#C8D7DE", pale:"#E7F5F7" };
const pres = Presentation.create({ slideSize: { width: W, height: H } });
const MAX = Number(process.env.MAX_SLIDES ?? 19);

function shape(slide,x,y,w,h,fill="none",geometry="rect",line="none") {
  return slide.shapes.add({geometry,position:{left:x,top:y,width:w,height:h},fill,line:{fill:line,width:line==="none"?0:1}});
}
function text(slide,txt,x,y,w,h,o={}) {
  const s=shape(slide,x,y,w,h,o.fill??"none",o.geometry??"rect",o.line??"none");
  s.text=txt; s.text.style={typeface:FONT,fontSize:o.size??22,bold:o.bold??false,color:o.color??C.ink,alignment:o.align??"left",verticalAlignment:o.valign??"top",autoFit:"none",wrap:"square",...o.style};
  s.text.insets=o.insets??{left:0,right:0,top:0,bottom:0}; return s;
}
function bullets(slide,items,x,y,w,h,o={}) {
  const s=shape(slide,x,y,w,h); s.text=makeNativeBulletParagraphs(items,{marginLeftPoints:o.marginLeftPoints??19,hangingPoints:o.hangingPoints??9,spaceAfterPoints:o.spaceAfterPoints??7});
  s.text.style={typeface:FONT,fontSize:o.size??20,color:o.color??C.ink,autoFit:"none",wrap:"square"}; s.text.insets={left:0,right:0,top:0,bottom:0}; return s;
}
function title(slide,txt,dark=false){text(slide,txt,58,36,1120,62,{size:34,bold:true,color:dark?C.white:C.ink});shape(slide,58,104,74,5,C.cyan);}
function footer(slide,n,dark=false,src=""){if(src)text(slide,src,58,683,1060,18,{size:10,color:dark?"#BDD0DB":C.muted});text(slide,String(n).padStart(2,"0"),1190,680,35,18,{size:11,bold:true,color:dark?C.cyan2:C.muted,align:"right"});}
function notes(slide,s){slide.speakerNotes.textFrame.setText(s);}
function tag(slide,txt,x,y,w,fill=C.cyan,darkText=true){const s=shape(slide,x,y,w,30,fill,"roundRect");s.text=txt;s.text.style={typeface:FONT,fontSize:13,bold:true,color:darkText?C.navy:C.white,alignment:"center",verticalAlignment:"middle",autoFit:"none"};s.text.insets={left:6,right:6,top:2,bottom:2};}
async function image(slide,file,x,y,w,h,fit="cover",alt="") {const ext=path.extname(file).toLowerCase(); const contentType=ext===".png"?"image/png":ext===".jpg"||ext===".jpeg"?"image/jpeg":"image/webp"; const bytes=new Uint8Array(await fs.readFile(file));slide.images.add({blob:bytes,contentType,alt,fit,position:{left:x,top:y,width:w,height:h}});}
function card(slide,x,y,w,h,heading,body,accent=C.cyan,dark=false){shape(slide,x,y,w,h,dark?C.navy2:C.white,"roundRect",dark?"#315064":C.line);shape(slide,x,y,7,h,accent,"roundRect");text(slide,heading,x+24,y+20,w-40,34,{size:20,bold:true,color:dark?C.white:C.ink});text(slide,body,x+24,y+67,w-42,h-82,{size:16,color:dark?"#D4E3EA":C.muted});}
function node(slide,x,y,w,h,head,body,i){shape(slide,x,y,w,h,C.navy2,"roundRect","#315064");text(slide,String(i).padStart(2,"0"),x+14,y+12,28,20,{size:12,bold:true,color:C.cyan2});if(h<100){text(slide,head,x+55,y+10,145,24,{size:17,bold:true,color:C.white});text(slide,body,x+210,y+11,w-225,h-20,{size:13,color:"#BDD0DB"});}else{text(slide,head,x+14,y+39,w-28,56,{size:18,bold:true,color:C.white});text(slide,body,x+14,y+101,w-28,h-111,{size:13,color:"#BDD0DB"});}}

const assets=path.join(workspaceDir,"presentation_assets");
const soft=path.join(assets,"softlogic");

// 1 Cover
if (MAX >= 1) {
 const s=pres.slides.add(); s.background.fill=C.navy; await image(s,path.join(assets,"astana_cv_cover.png"),0,0,W,H,"cover","Concept illustration of road video analytics in Astana"); shape(s,0,0,735,H,{color:C.navy,transparency:8});
 tag(s,"PhD SEMINAR",64,60,150,C.cyan,true); text(s,"Intelligent Digital Monitoring of Road Infrastructure",64,145,625,170,{size:45,bold:true,color:C.white}); text(s,"Vehicle video analytics for functional-condition assessment and evidence-based reporting",66,350,555,90,{size:23,color:"#D6E5EC"});
 shape(s,66,492,220,4,C.amber); text(s,"Astana  |  2026",66,520,280,32,{size:18,bold:true,color:C.white}); text(s,"PhD dissertation research programme",66,565,350,28,{size:16,color:C.cyan2});
 notes(s,"Cover image is a generated concept illustration and does not document a specific road segment. Presentation title and scope supplied by the author.");
}

// 2 Urban monitoring problem
if (MAX >= 2) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Urban monitoring problem");
 text(s,"Astana already produces a distributed stream of road observations",60,142,720,55,{size:30,bold:true});
 bullets(s,["Dashcams in municipal and private vehicles repeatedly record roads and roadside assets.","Manual review cannot scale to the volume, geographic coverage, and seasonal variability of the video stream.","The missing layer is a reproducible method that links visual evidence to a mapped asset, condition label, confidence score, and inspection date."],65,220,585,300,{size:21,spaceAfterPoints:11});
 shape(s,700,160,500,390,C.navy,"roundRect"); const ns=[["Video + GPS","mobile observations"],["Perception","objects and surfaces"],["Condition","functional state"],["Report","map and work order"]]; ns.forEach((d,i)=>node(s,730,195+i*86,420,68,d[0],d[1],i+1));
 text(s,"Research premise",65,565,180,25,{size:16,bold:true,color:C.amber}); text(s,"Repeated observations can convert opportunistic video into a longitudinal infrastructure inventory.",65,596,1050,42,{size:24,bold:true});footer(s,2);
 notes(s,"Motivation based on the dissertation description provided by the author. No citywide video-volume estimate is asserted because no verified operational count was supplied.");
}

// 3 Aim, object, subject, hypothesis
if (MAX >= 3) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Dissertation framing");
 card(s,60,145,555,190,"Aim","Develop an intelligent system that estimates the functional condition of road infrastructure from vehicle video and produces traceable reports.",C.cyan);
 card(s,665,145,555,190,"Hypothesis","Given mapped assets and repeated georeferenced observations, machine-learning models can infer functional condition with measurable uncertainty.",C.amber,true);
 card(s,60,375,360,190,"Object of research","Urban road infrastructure observed from moving vehicles.",C.green);
 card(s,460,375,360,190,"Subject of research","Methods for detection, segmentation, condition classification, spatial association, and temporal aggregation.",C.cyan);
 card(s,860,375,360,190,"Unit of evidence","Asset or road segment + coordinates + timestamp + state + confidence + image fragment.",C.amber);
 footer(s,3);notes(s,"Research framing developed from the author's stated aim and hypothesis.");
}

// 4 Research questions
if (MAX >= 4) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"Research questions",true);
 const qs=[
  ["RQ1","Which representation fits each infrastructure class: bounding box, mask, keypoint, or road segment?"],
  ["RQ2","How much do spatial, geometric, and non-overlap priors improve recognition under occlusion?"],
  ["RQ3","How can local Astana data correct domain shift caused by snow, darkness, glare, and camera diversity?"],
  ["RQ4","How should repeated observations be fused into a reliable operational state and report?"]
 ]; qs.forEach((q,i)=>{const x=i%2?660:70,y=i<2?155:385;shape(s,x,y,550,175,C.navy2,"roundRect","#315064");tag(s,q[0],x+25,y+24,65,i===3?C.amber:C.cyan,true);text(s,q[1],x+25,y+72,495,78,{size:23,bold:true,color:C.white});});footer(s,4,true);notes(s,"The research questions operationalize model design, domain adaptation, and evidence aggregation.");
}

// 5 Published starting point
if (MAX >= 5) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Published starting point: street-light monitoring in Astana");
 text(s,"Our peer-reviewed study established the first validated component of the dissertation",60,137,1080,45,{size:27,bold:true});
 card(s,60,210,350,280,"Dataset","4,260 annotated night-time dashcam frames\n1280 × 720 pixels\nAstana road scenes\nPole and lamp classes",C.cyan);
 card(s,465,210,350,280,"Environmental coverage","1,494 clear frames\n1,524 snowfall frames\n1,242 rain frames\n396 frames without poles or lamps",C.green);
 card(s,870,210,350,280,"Validated result","YOLO-CSE achieved the best reported recall and F1 among the evaluated models, supporting reliable detection under difficult night conditions.",C.amber,true);
 text(s,"Dissertation extension",60,548,220,28,{size:16,bold:true,color:C.amber});text(s,"Scale the evidence model from lighting to roads, markings, curbs, traffic control, and public-transport assets.",285,542,910,50,{size:23,bold:true});footer(s,5,false,"Aiymbay et al., Symmetry 17(8), 1294, 2025");
 notes(s,"Source: Aiymbay, S.; Zhumadillayeva, A.; Matson, E.T.; Matkarimov, B.; Mukhametzhanova, B. Applying Computer Vision for the Detection and Analysis of the Condition and Operation of Street Lighting. Symmetry 2025, 17, 1294. https://doi.org/10.3390/sym17081294");
}

// 6 Dataset protocol
if (MAX >= 6) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Published dataset and training protocol");
 const steps=[["Acquisition","Fujida Karma Duos cameras mounted on SUVs and sedans; night-time routes in Astana."],["Annotation","Two object classes: poles and lamps. Partial visibility and adverse weather retained."],["Split","75% training, 10% validation, 15% testing."],["Training","640 × 640 input; COCO2017 pretraining; 100 epochs; batch 32; NVIDIA A10."]];steps.forEach((d,i)=>node(s,75+i*300,160,265,245,d[0],d[1],i+1));
 shape(s,75,455,1165,105,C.pale,"roundRect");text(s,"Methodological lesson",105,478,240,28,{size:18,bold:true,color:C.cyan});text(s,"Retaining snowfall, rain, empty frames, and vehicle-dependent viewpoints makes the benchmark closer to the intended municipal operating environment.",105,515,1070,42,{size:22,bold:true});footer(s,6,false,"Aiymbay et al., 2025");notes(s,"Experimental settings and dataset counts from https://doi.org/10.3390/sym17081294");
}

// 7 YOLO-CSE
if (MAX >= 7) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"YOLO-CSE architecture and structural priors",true);
 text(s,"YOLO-CSE adds convolution and squeeze-and-excitation attention within the YOLOv5 C3 bottleneck.",65,135,1080,45,{size:25,bold:true,color:C.white});
 const ds=[["Input","640 × 640 frame"],["Backbone","multi-scale features"],["C3 + SE","channel recalibration"],["Detection heads","pole and lamp boxes"]];ds.forEach((d,i)=>{node(s,65+i*300,225,250,155,d[0],d[1],i+1);if(i<3)shape(s,320+i*300,280,30,30,C.cyan,"chevron");});
 card(s,65,440,350,150,"Bilateral symmetry","Pole and luminaire designs often contain mirrored structure.",C.cyan,true);card(s,465,440,350,150,"Translational regularity","Streetlights recur along road trajectories.",C.green,true);card(s,865,440,350,150,"Radial emission","Light patterns provide a functional cue at night.",C.amber,true);
 footer(s,7,true,"Aiymbay et al., 2025");notes(s,"Architecture and symmetry discussion from https://doi.org/10.3390/sym17081294");
}

// 8 Results chart
if (MAX >= 8) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Published benchmark results");
 const resultRows=[["YOLOv5n","0.743","0.772"],["YOLOv5s","0.772","0.753"],["YOLOv5m","0.777","0.740"],["YOLOv8n","0.711","0.749"],["YOLOv8s","0.757","0.764"],["YOLOv8m","0.788","0.791"],["RT-DETR","0.748","0.788"],["Faster R-CNN","0.757","0.754"],["YOLO-CSE","0.808","0.798"]];
 shape(s,70,145,760,42,C.navy,"roundRect");text(s,"Model",90,155,300,20,{size:16,bold:true,color:C.white});text(s,"F1",555,155,80,20,{size:16,bold:true,color:C.white,align:"center"});text(s,"mAP",690,155,90,20,{size:16,bold:true,color:C.white,align:"center"});
 resultRows.forEach((r,i)=>{const y=194+i*43;shape(s,70,y,760,38,i===8?C.pale:(i%2?C.white:C.paper),"rect",C.line);text(s,r[0],90,y+8,330,20,{size:15,bold:i===8});text(s,r[1],555,y+8,80,20,{size:15,bold:i===8,align:"center",color:i===8?C.cyan:C.ink});text(s,r[2],690,y+8,90,20,{size:15,bold:i===8,align:"center",color:i===8?C.amber:C.ink});});
 shape(s,870,160,330,300,C.navy,"roundRect");text(s,"YOLO-CSE",900,195,270,38,{size:29,bold:true,color:C.white});text(s,"Recall  0.794\nF1 score  0.808\nmAP  0.798",900,258,250,135,{size:26,bold:true,color:C.cyan2});text(s,"Best recall and F1 in the reported comparison.",900,410,260,68,{size:18,color:"#D4E3EA"});
 text(s,"Interpretation",875,510,150,25,{size:16,bold:true,color:C.amber});text(s,"The architecture improves missed-object control while retaining competitive precision.",875,542,300,72,{size:19,bold:true});footer(s,8,false,"Values reported in Aiymbay et al., 2025");notes(s,"All values reproduced from the comparison table in https://doi.org/10.3390/sym17081294. Precision/recall values are discussed in the paper; this chart displays F1 and mAP.");
}

// 9 Limitations
if (MAX >= 9) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Observed limitations and dissertation response");
 const rows=[["Small and distant luminaires","Higher-resolution tiling and temporal track aggregation"],["Partial occlusion by trees, buildings, and vehicles","Instance-level association plus structural priors"],["Bright windows and vehicle lights","Hard-negative mining and context-aware classification"],["Single-city, two-class scope","Multi-class Astana dataset and external benchmark pretraining"]];rows.forEach((r,i)=>{const y=150+i*108;text(s,r[0],75,y,420,64,{size:21,bold:true});shape(s,505,y+12,42,32,C.cyan,"chevron");text(s,r[1],585,y,585,70,{size:21,color:C.muted});if(i<3)shape(s,75,y+88,1095,1,C.line);});footer(s,9);notes(s,"Limitations synthesize failure modes and scope boundaries discussed in the author's published study. Proposed responses are dissertation hypotheses to be tested.");
}

// 10 Extension taxonomy
if (MAX >= 10) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"Infrastructure classes in the dissertation",true);
 const items=[["Streetlights","pole, luminaire, operating state"],["Road surface","drivable area, snow, ice, damage"],["Road markings","visibility and wear"],["Curbs and road blocks","curb, barrier, speed bump"],["Traffic control","traffic lights and signs"],["Public transport","bus stops and accessibility"]];items.forEach((d,i)=>{const x=65+(i%3)*400,y=150+Math.floor(i/3)*220;card(s,x,y,350,170,d[0],d[1],i===5?C.amber:[C.cyan,C.green,C.amber][i%3],true);});footer(s,10,true);notes(s,"Class scope supplied by the author. Labels will be refined through a formal annotation ontology before data collection.");
}

// 11 scene priors
if (MAX >= 11) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Spatial and overlap priors");
 const data=[
  ["Streetlights","Upper image; partial poles and luminaires; overlaps with trees, vehicles, buildings, and window light. Vehicle and signal lights provide hard negatives."],
  ["Road + markings","Lower image; large, non-rectangular regions; vehicles and pedestrians occlude the surface. Gaps between vehicle masks may still belong to road."],
  ["Curbs / blocks / bumps","Lower image; few physical types; frequent vehicle occlusion and strong perspective distortion."],
  ["Traffic lights / signs","Intersection and roadside context; candidate non-overlap constraints must be validated rather than assumed universally."],
  ["Bus stops","Roadside structure with high appearance diversity; detection requires local examples and map context."]
 ];data.forEach((d,i)=>{const y=135+i*99;tag(s,String(i+1),65,y+8,45,i===4?C.amber:C.cyan,true);text(s,d[0],130,y,255,38,{size:20,bold:true});text(s,d[1],390,y,810,74,{size:17,color:C.muted});if(i<4)shape(s,130,y+83,1070,1,C.line);});footer(s,11);notes(s,"Operational priors supplied by the author. The dissertation will encode them as testable constraints and report ablations, because real scenes can contain annotation and projection exceptions.");
}

// 12 task decomposition
if (MAX >= 12) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Multi-task perception design");
 const ts=[["Object detection","poles, luminaires, signs, signals, bus stops"],["Semantic / instance segmentation","road surface, markings, curbs, snow and ice regions"],["Binary or multilabel classification","functional condition of each asset or road segment"],["Tracking and geospatial fusion","deduplicate observations and associate them with mapped assets"]];ts.forEach((d,i)=>{node(s,70+i*300,160,265,270,d[0],d[1],i+1);});
 shape(s,70,478,1165,100,C.navy,"roundRect");text(s,"Joint evidence record",100,500,215,28,{size:18,bold:true,color:C.cyan2});text(s,"geometry + class + condition + confidence + coordinates + timestamp + provenance",325,495,835,43,{size:24,bold:true,color:C.white});footer(s,12);notes(s,"Proposed dissertation architecture. Models and loss functions remain experimental choices and will be compared empirically.");
}

// 13 segmentation
if (MAX >= 13) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"Road segmentation will be implemented",true);
 text(s,"Bounding boxes do not represent the geometry of road surfaces or markings",65,136,950,45,{size:28,bold:true,color:C.white});
 card(s,65,220,350,250,"Drivable-area mask","Separates visible road from sidewalks, medians, buildings, and background. Occluding vehicles remain separate instances.",C.cyan,true);
 card(s,465,220,350,250,"Surface-condition mask","Segments snow, ice, water, potholes, cracks, and repaired patches where pixel-level evidence is required.",C.green,true);
 card(s,865,220,350,250,"Marking mask","Estimates line visibility and wear without forcing thin, elongated structures into unstable boxes.",C.amber,true);
 text(s,"Primary metrics",65,540,180,25,{size:16,bold:true,color:C.amber});text(s,"mIoU and class IoU for segmentation; boundary F1 for markings; calibration error for confidence.",250,534,900,42,{size:22,bold:true,color:C.white});footer(s,13,true);notes(s,"Road segmentation is a planned dissertation component. Metric definitions will follow the public benchmark protocols where applicable.");
}

// 14 binary states
if (MAX >= 14) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Binary functional-condition classifiers");
 text(s,"Condition labels answer operational questions after localization or segmentation",60,135,1000,42,{size:26,bold:true});
 const bs=[["Road segment","snow cleared / not cleared","ice present / absent","surface damaged / acceptable"],["Road markings","visible / not visible","worn / acceptable","occluded / observable"],["Street lighting","lamp on / off","pole intact / damaged","observable / uncertain"],["Other assets","curb intact / damaged","bus stop accessible / obstructed","sign present / missing"]];bs.forEach((d,i)=>{const x=i%2?650:60,y=i<2?210:430;shape(s,x,y,570,165,C.white,"roundRect",C.line);text(s,d[0],x+24,y+20,210,30,{size:21,bold:true,color:i===0?C.cyan:i===1?C.green:i===2?C.amber:C.red});text(s,d.slice(1).join("\n"),x+250,y+20,285,120,{size:18,color:C.muted});});footer(s,14);notes(s,"Proposed binary and multilabel operational states. Final definitions require municipal acceptance criteria and an annotation manual. 'Snow cleared' is a local service-state label, not a generic weather label.");
}

// 15 public datasets
if (MAX >= 15) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Public datasets for pretraining and benchmarking");
 const rows=[
  ["BDD100K","100K driving videos; drivable area, lanes, detection, segmentation","Road and marking pretraining"],
  ["Mapillary Vistas","25,000 high-resolution street images; 66 categories","Fine-grained street-object segmentation"],
  ["ACDC","4,006 adverse-condition images with pixel labels; fog, night, rain, snow","Robustness under adverse visibility"],
  ["RDD2022","47,420 images from six countries; 55,000+ damage instances","Crack and pothole detection"],
 ];
 shape(s,60,145,1160,55,C.navy,"roundRect");text(s,"Dataset",82,160,210,24,{size:18,bold:true,color:C.white});text(s,"Verified scope",300,160,540,24,{size:18,bold:true,color:C.white});text(s,"Role in this dissertation",865,160,315,24,{size:18,bold:true,color:C.white});
 rows.forEach((r,i)=>{const y=212+i*92;shape(s,60,y,1160,80,i%2?C.paper:C.white,"rect",C.line);text(s,r[0],82,y+18,190,38,{size:20,bold:true,color:C.cyan});text(s,r[1],300,y+13,525,52,{size:17,color:C.muted});text(s,r[2],865,y+13,315,52,{size:17,bold:true});});
 text(s,"Public data supports representation learning. It does not replace local Astana condition labels or municipal acceptance criteria.",65,606,1110,42,{size:21,bold:true,color:C.red});footer(s,15);notes(s,"Sources: BDD100K official repository and CVPR paper: https://github.com/bdd100k/bdd100k and https://openaccess.thecvf.com/content_CVPR_2020/html/Yu_BDD100K_A_Diverse_Driving_Dataset_for_Heterogeneous_Multitask_Learning_CVPR_2020_paper.html ; Mapillary Vistas ICCV paper: https://openaccess.thecvf.com/content_iccv_2017/html/Neuhold_The_Mapillary_Vistas_ICCV_2017_paper.html ; ACDC official dataset and ICCV paper: https://acdc.vision.ee.ethz.ch/ and https://openaccess.thecvf.com/content/ICCV2021/html/Sakaridis_ACDC_The_Adverse_Conditions_Dataset_With_Correspondences_for_Semantic_Driving_ICCV_2021_paper.html ; RDD2022: https://github.com/sekilab/RoadDamageDetector and https://arxiv.org/abs/2209.08538");
}

// 16 local dataset
if (MAX >= 16) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"Local Astana dataset is the core empirical contribution",true);
 const ps=[["Sampling frame","Road hierarchy, districts, intersections, bridges, bus corridors, and known assets."],["Seasonal design","Dry, rain, snowfall, post-clearing, freeze-thaw, day, dusk, and night."],["Annotation layers","Boxes, masks, binary states, observability flags, GPS, timestamp, route, and camera metadata."],["Leakage control","Split by route, location, and time so adjacent video frames cannot inflate test performance."],["Governance","Privacy filtering, retention rules, annotator agreement, and auditable label revisions."]];ps.forEach((d,i)=>{const y=130+i*102;tag(s,String(i+1),68,y+10,48,i===4?C.amber:C.cyan,true);text(s,d[0],140,y,245,32,{size:20,bold:true,color:C.white});text(s,d[1],390,y,805,70,{size:18,color:"#D4E3EA"});});footer(s,16,true);notes(s,"Proposed local data protocol. Exact route counts and sample sizes should be fixed after a pilot and power/coverage analysis, so this slide deliberately avoids invented targets.");
}

// 17 SoftLogic evidence images
if (MAX >= 17) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Industrial analogue: mobile road-condition analytics");
 await image(s,path.join(soft,"road_defect.png"),60,145,555,305,"cover","SoftLogic example of detected road-surface defect");await image(s,path.join(soft,"asphalt_contamination.png"),665,145,555,305,"cover","SoftLogic example of detected asphalt contamination");
 text(s,"Road-surface defect example",60,468,555,28,{size:18,bold:true});text(s,"Asphalt contamination example",665,468,555,28,{size:18,bold:true});
 shape(s,60,530,1160,85,C.navy,"roundRect");text(s,"Interpretation",88,550,150,24,{size:16,bold:true,color:C.cyan2});text(s,"The vendor material demonstrates feasibility and reporting concepts. It does not provide an independent scientific benchmark for Astana.",250,545,910,45,{size:21,bold:true,color:C.white});footer(s,17,false,"Images: SoftLogic Kontrol ODX product page");notes(s,"Images and product context: https://softlogic.ai/solution/kontrol_odx. Vendor-provided examples are shown as an industrial analogue, not as independent validation. Image URLs: https://softlogic.ai/media/file/solutions/image/detects/1/1.1(1).webp and https://softlogic.ai/media/file/solutions/image/detects/2/2.1.webp");
}

// 18 system architecture
if (MAX >= 18) {
 const s=pres.slides.add();s.background.fill=C.white;title(s,"Proposed end-to-end system");
 const ar=[["Capture","video, GPS, time, camera"],["Quality control","blur, darkness, privacy"],["Perception","detection and segmentation"],["State inference","binary / multilabel condition"],["Spatial fusion","asset and segment association"],["Decision layer","map, report, inspection queue"]]; ar.forEach((d,i)=>{const x=45+i*205;node(s,x,205,175,220,d[0],d[1],i+1);if(i<5)shape(s,x+179,292,22,30,C.cyan,"chevron");});
 shape(s,70,500,1140,90,C.pale,"roundRect");text(s,"Temporal rule",98,522,155,25,{size:17,bold:true,color:C.cyan});text(s,"A single frame creates an observation. Repeated independent observations create a condition estimate and trigger a report.",260,516,900,46,{size:22,bold:true});footer(s,18);notes(s,"Proposed system architecture. Thresholds for temporal fusion and report generation will be learned or selected on validation data and tested prospectively.");
}

// 19 experimental plan
if (MAX >= 19) {
 const s=pres.slides.add();s.background.fill=C.paper;title(s,"Experimental design and expected contribution");
 const ex=[["Perception accuracy","mAP, recall, F1; mIoU and boundary F1 for masks"],["Condition accuracy","balanced accuracy, macro F1, AUROC, calibration error"],["Robustness","season, weather, time, camera, distance, occlusion, and district strata"],["Generalization","public-data pretraining vs Astana-only vs combined domain adaptation"],["Operational validity","asset-level precision, false alerts per kilometre, time-to-confirm, report completeness"]];ex.forEach((d,i)=>{const y=130+i*91;text(s,d[0],70,y,270,40,{size:19,bold:true,color:i===4?C.amber:C.cyan});text(s,d[1],350,y,830,62,{size:18,color:C.muted});if(i<4)shape(s,70,y+73,1110,1,C.line);});
 shape(s,70,585,1110,70,C.navy,"roundRect");text(s,"Expected contribution: an Astana-specific, uncertainty-aware method that converts repeated vehicle observations into auditable asset and road-segment histories.",92,598,1065,46,{size:17,bold:true,color:C.white});footer(s,19);notes(s,"Proposed evaluation framework and expected contribution. Exact primary endpoints and acceptance thresholds will be preregistered after the pilot dataset establishes prevalence and uncertainty.");
}

// 20 novelty and conclusion
if (false) {
 const s=pres.slides.add();s.background.fill=C.navy;title(s,"Scientific contribution and expected outcome",true);
 tag(s,"CONTRIBUTION 1",65,155,170,C.cyan,true);text(s,"Multi-representation perception",65,205,335,42,{size:25,bold:true,color:C.white});text(s,"Detection, segmentation, and condition classification are assigned according to object geometry and operational meaning.",65,265,335,115,{size:20,color:"#D4E3EA"});
 tag(s,"CONTRIBUTION 2",465,155,170,C.green,true);text(s,"Astana-specific evidence",465,205,335,42,{size:25,bold:true,color:C.white});text(s,"A seasonal georeferenced dataset addresses winter maintenance, night lighting, and local infrastructure types.",465,265,335,115,{size:20,color:"#D4E3EA"});
 tag(s,"CONTRIBUTION 3",865,155,170,C.amber,true);text(s,"Condition through time",865,205,335,42,{size:25,bold:true,color:C.white});text(s,"Repeated observations become auditable histories for mapped assets and road segments.",865,265,335,115,{size:20,color:"#D4E3EA"});
 shape(s,65,445,1135,4,C.cyan);text(s,"Expected result",65,490,180,26,{size:17,bold:true,color:C.amber});text(s,"A validated prototype that converts vehicle video into condition maps, uncertainty-aware reports, and prioritized inspection evidence.",65,535,1110,82,{size:27,bold:true,color:C.white});footer(s,20,true);notes(s,"Expected contributions and outputs are prospective claims. The published street-light study provides the validated starting point; the multi-object and road-condition components remain dissertation work.");
}

const expectedSlideSizeEmu="12192000,6858000";
const requirements={explicitTotalSlideCount:19,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],requiredEmbeddedWorkbookChartOwnerSlides:[],materializeLiteralChartWorkbooks:false};
const fontPolicy={basis:"design",families:[FONT]};
const stagingDir=path.join(workspaceDir,".codex-finalizer-en");await fs.mkdir(stagingDir,{recursive:true});const candidatePath=path.join(stagingDir,"candidate.pptx");
const debugSnapshot=await pres.inspect({kind:"slide,shape,image,chart,layout",maxChars:200000});await fs.writeFile(path.join(TMP_DIR,"debug.ndjson"),debugSnapshot.ndjson);
await (await PresentationFile.exportPptx(pres)).save(candidatePath);
if(MAX<19){console.log(`diagnostic export: ${MAX}`);process.exit(0);}
await finalizePresentation({...requirements,workspaceDir,candidatePath,finalPath:FINAL_PPTX,pythonExecutable:RUNTIME_PYTHON,integrityValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_package_integrity.py"),layoutValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_layout_geometry.py"),layoutArgs:["--expected-slide-size-emu",expectedSlideSizeEmu,"--validate-bullet-geometry","--validate-heading-fit"],fontPolicy,verifyArtifactToolImport:true,receiptPath:path.join(stagingDir,`${path.basename(FINAL_PPTX)}.validation.json`)});
console.log(FINAL_PPTX);
