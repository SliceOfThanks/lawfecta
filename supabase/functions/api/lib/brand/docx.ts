// The Lawfecta logo in the header of every page of a Word export (Stacey 2026-11-09): the round mark and "Lawfecta DELA".
// The header has its own relationship file for the picture, so it never clashes with the document's own image ids.
import { strToU8 } from "npm:fflate@0.8.2";
import { logoPng } from "./logo.ts";

const SIZE = 365760; // 0.4 inch, in EMU

export const BRAND_HEADER_REF = `<w:headerReference w:type="default" r:id="rIdBrandHeader"/>`;
export const BRAND_HEADER_REL = `<Relationship Id="rIdBrandHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`;
export const BRAND_HEADER_TYPES = `<Default Extension="png" ContentType="image/png"/>`;
export const BRAND_HEADER_OVERRIDE = `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`;

export function brandHeaderFiles(): Record<string, Uint8Array> {
  const ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const pic = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${SIZE}" cy="${SIZE}"/><wp:docPr id="9001" name="Lawfecta logo" descr="Lawfecta"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="9001" name="lawfecta-logo.png" descr="Lawfecta"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdBrandLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${SIZE}" cy="${SIZE}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const label = `<w:r><w:rPr><w:color w:val="5F6675"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">  Lawfecta DELA</w:t></w:r>`;
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${ns}><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${pic}${label}</w:p></w:hdr>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdBrandLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/lawfecta-logo.png"/></Relationships>`;
  return { "word/header1.xml": strToU8(header), "word/_rels/header1.xml.rels": strToU8(rels), "word/media/lawfecta-logo.png": logoPng() };
}
