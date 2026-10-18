import { chromium } from "/Users/sunggat/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright-core/index.mjs";

const pairs = [["motivation_toward","motivation_away"],["internal_reference","external_reference"],["active","reflective"],["options","procedures"],["global","detail"],["associated","dissociated"]];
const user = { id:"demo-report", code:"DEMO", firstName:"Айбар", lastName:"Серік", birthYear:"2009", city:"Алматы", school:"ADAM", grade:"10", phone:"", createdAt:new Date().toISOString(), result:{
  scales:pairs.map(([first,second],i)=>({first,second,firstScore:6-i%3,secondScore:i%3})),
  professions:Array.from({length:10},(_,i)=>({id:i+1,name_ru:`Профессия ${i+1}`,name_kk:`Мамандық ${i+1}`,category_ru:"Технологии",category_kk:"Технология"})),
  intelligences:Array.from({length:8},(_,i)=>({key:`i${i}`,name_ru:`Тип интеллекта ${i+1}`,name_kk:`Интеллект түрі ${i+1}`,score:88-i*5})),
}};
const browser = await chromium.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:true });
const page = await browser.newPage();
await page.addInitScript(({user})=>{ localStorage.setItem("adam-demo-users-v2",JSON.stringify([user])); sessionStorage.setItem("adam-demo-session-v2",JSON.stringify({role:"admin"})); },{user});
await page.goto("http://127.0.0.1:5173/report/demo-report",{waitUntil:"networkidle"});
await page.emulateMedia({media:"print"});
await page.pdf({path:"../output/pdf/adam-future-canva-report.pdf",format:"A4",printBackground:true,margin:{top:"0",right:"0",bottom:"0",left:"0"}});
await browser.close();
