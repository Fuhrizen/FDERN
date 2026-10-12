// Native ChatMessage commands carry the server-authenticated author. No arbitrary damage RPC.
const pending=new Map();let tail=Promise.resolve();
export function serial(fn){const task=tail.then(fn);tail=task.catch(()=>{});return task;}
export function registerSocket(execute){
  Hooks.on('createChatMessage',async message=>{
    const command=message.getFlag('fdern','command');if(!command||game.users.activeGM?.id!==game.user.id)return;
    const user=message.author;if(!user?.active)return;
    try{const result=await serial(()=>execute(command.request,user));await message.setFlag('fdern','response',{id:command.id,result:result?.toObject?{id:result.id,documentName:result.documentName}:result??null,error:null});}
    catch(error){await message.setFlag('fdern','response',{id:command.id,error:error.message});}
  });
  Hooks.on('updateChatMessage',message=>{
    const response=message.getFlag('fdern','response');if(!response)return;const p=pending.get(response.id);if(!p)return;
    clearTimeout(p.timer);pending.delete(response.id);response.error?p.reject(Error(response.error)):p.resolve(response.result);
  });
  return async request=>{
    if(game.user.isGM)return serial(()=>execute(request,game.user));
    if(!game.users.activeGM)throw Error('A connected GM is needed to resolve combat automation.');
    const id=foundry.utils.randomID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('The GM request timed out. Check the encounter before retrying.'));},300000);pending.set(id,{resolve,reject,timer});
      foundry.documents.ChatMessage.create({content:'<p class="fdern-command">FDERN action request</p>',whisper:[game.users.activeGM.id],flags:{fdern:{command:{id,request}}}}).catch(error=>{clearTimeout(timer);pending.delete(id);reject(error);});
    });
  };
}
