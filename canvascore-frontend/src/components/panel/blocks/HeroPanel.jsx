import React from 'react';
import { Layout, Sliders, Image as ImageIcon, Trash2 } from 'lucide-react';
import { PanelAccordion } from '../fields';
import { handleNumericKey, labelStyle, inputStyle } from '../helpers';
import { RichTextField } from '../../../editor/RichText';

// Content panel: HERO
export default function HeroPanel({ ctx }) {
  const { selectedBlock, handleContentChange, setMediaPickerTarget, pages } = ctx;
  return (
    <>
      <PanelAccordion title="Background & Titles" icon={Layout} defaultOpen={true}>
        <label style={labelStyle}>Hero Background Image</label>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <input type="text" style={{...inputStyle, flex: 1}} value={selectedBlock.content.bgImage || ''} onChange={e => handleContentChange('bgImage', e.target.value)} />
          <button onClick={() => setMediaPickerTarget('bgImage')} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0 12px', cursor: 'pointer' }}><ImageIcon size={16}/></button>
        </div>
        <label style={labelStyle}>Main Title</label>
        <RichTextField label="Main title" variant="basic" value={selectedBlock.content.title || ''} onChange={(val) => handleContentChange('title', val)} />
        <label style={labelStyle}>Subtitle</label>
        <RichTextField label="Subtitle" variant="basic" value={selectedBlock.content.subtitle || ''} onChange={(val) => handleContentChange('subtitle', val)} />
      </PanelAccordion>

      <PanelAccordion title="Hero Buttons" icon={Sliders} defaultOpen={false}>
        {(selectedBlock.content.buttons || []).map((btn, index) => (
          <div key={index} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{...labelStyle, margin: 0}}>Button {index + 1}</label>
              <button onClick={() => {
                const newBtns = [...selectedBlock.content.buttons]; newBtns.splice(index, 1); handleContentChange('buttons', newBtns);
              }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14}/></button>
            </div>
            <input type="text" style={{...inputStyle, marginBottom: '8px'}} value={btn.text} onChange={e => {
              const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].text = e.target.value; handleContentChange('buttons', newBtns);
            }} placeholder="Button Text" />
            <select style={{...inputStyle, marginBottom: '8px'}} value={btn.url} onChange={e => {
              const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].url = e.target.value; handleContentChange('buttons', newBtns);
            }}>
              <option value="#">Select internal page...</option>
              {pages.map(p => <option key={p.id} value={p.clean_slug ? p.clean_slug + '/index.html' : 'index.html'}>📄 {p.title}</option>)}
            </select>
            <input type="text" style={inputStyle} placeholder="Custom URL..." value={btn.url} onChange={e => {
              const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].url = e.target.value; handleContentChange('buttons', newBtns);
            }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <div style={{ flex: 1 }}><label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>BG</label><input type="color" value={btn.bgColor} onChange={e => {
                const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].bgColor = e.target.value; handleContentChange('buttons', newBtns);
              }} style={{width:'100%', border:'none', height:'30px', cursor:'pointer'}}/></div>
              <div style={{ flex: 1 }}><label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>Text</label><input type="color" value={btn.textColor} onChange={e => {
                const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].textColor = e.target.value; handleContentChange('buttons', newBtns);
              }} style={{width:'100%', border:'none', height:'30px', cursor:'pointer'}}/></div>
              <div style={{ flex: 1 }}>
                <label style={{fontSize:'10px', color:'#cbd5e1', display:'block'}}>Radius</label>
                <input type="text" value={btn.borderRadius} onChange={e => {
                  const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].borderRadius = e.target.value; handleContentChange('buttons', newBtns);
                }} onKeyDown={e => handleNumericKey(e, btn.borderRadius, val => {
                  const newBtns = [...(selectedBlock.content.buttons || [])]; newBtns[index].borderRadius = val; handleContentChange('buttons', newBtns);
                })} style={{...inputStyle, padding:'4px', height:'30px'}} title="Press Up/Down arrow"/>
              </div>
            </div>
          </div>
        ))}
        <button onClick={() => {
          const newBtns = selectedBlock.content.buttons ? [...selectedBlock.content.buttons] : [];
          newBtns.push({ text: 'New Button', url: '#', bgColor: '#10b981', textColor: '#ffffff', borderRadius: '8px' });
          handleContentChange('buttons', newBtns);
        }} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#38bdf8', border: '2px dashed #334155', borderRadius: '8px', cursor: 'pointer' }}>+ Add Button</button>
      </PanelAccordion>
    </>
  );
}
