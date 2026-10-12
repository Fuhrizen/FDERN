export function pointInPolygon(p,vertices){let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function polygonFor(shape){
  if(shape.type==='polygon'){const points=shape.points??[];return Array.from({length:points.length/2},(_,i)=>({x:points[i*2],y:points[i*2+1]}));}
  if(shape.type==='ellipse')return Array.from({length:48},(_,i)=>({x:shape.x+Math.cos(i*Math.PI/24)*shape.radiusX,y:shape.y+Math.sin(i*Math.PI/24)*shape.radiusY}));
  const {x,y,width,height,rotation=0}=shape;const cx=x+width/2,cy=y+height/2,angle=rotation*Math.PI/180;return [[x,y],[x+width,y],[x+width,y+height],[x,y+height]].map(([px,py])=>({x:cx+(px-cx)*Math.cos(angle)-(py-cy)*Math.sin(angle),y:cy+(px-cx)*Math.sin(angle)+(py-cy)*Math.cos(angle)}));
}
export function segmentIntersection(a,b,c,d){const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y;const denom=dx*ey-dy*ex;if(Math.abs(denom)<1e-9)return null;const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/denom,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/denom;return t>=0&&t<=1&&u>=0&&u<=1?t:null;}
export function segmentCrosses(a,b,polygon){return pointInPolygon(a,polygon)||pointInPolygon(b,polygon)||polygon.some((c,i)=>segmentIntersection(a,b,c,polygon[(i+1)%polygon.length])!==null);}
export const centre = (token,size=100)=>({x:token.x+token.width*size/2,y:token.y+token.height*size/2});
export function edgeDistance(a,b,size=100,feet=5){const dx=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.width*size,b.x+b.width*size));const dy=Math.max(0,Math.max(a.y,b.y)-Math.min(a.y+a.height*size,b.y+b.height*size));return Math.ceil((Math.hypot(dx,dy)/size*feet-1e-8)/5)*5;}
