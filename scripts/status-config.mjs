import {conditionArtwork} from './artwork.mjs';
// Native status IDs are stable; only the bundled presentation changes.
export const STATUS_EFFECTS=Object.freeze([
  ['dead','Dead'],['down','Down'],['impaired','Impaired'],['threatened','Threatened'],['pinned','Pinned'],['overwhelmed','Overwhelmed'],['prone','Prone'],['take-cover','Take Cover'],['grappled','Grappled'],['stunned','Temporary Stun'],['overwatch','Reserved Reaction']
].map(([id,name])=>Object.freeze({id,name,img:conditionArtwork(id)})));
