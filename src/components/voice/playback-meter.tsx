"use client";
import { useEffect, useRef, type RefObject } from "react";
import "./voice-meter.css";

/** Audio intensity is sampled only while the actual element plays; silence remains still. */
export function PlaybackMeter({ audio, playing, label }: { audio: RefObject<HTMLAudioElement | null>; playing: boolean; label?: string }) {
  const bars = useRef<HTMLSpanElement>(null);
  const graph = useRef<{context:AudioContext;analyser:AnalyserNode;source:MediaElementAudioSourceNode; element:HTMLAudioElement} | null>(null);
  useEffect(() => () => { void graph.current?.context.close().catch(()=>undefined); }, []);
  useEffect(() => {
    const el = audio.current;
    if (!el || !playing || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (!graph.current || graph.current.element !== el) {
        void graph.current?.context.close().catch(()=>undefined);
        const context=new AudioContext();const analyser=context.createAnalyser();analyser.fftSize=64;
        const source=context.createMediaElementSource(el);source.connect(analyser);analyser.connect(context.destination);
        graph.current={context,analyser,source,element:el};
      }
      void graph.current.context.resume();
    } catch { return; }
    const visual=bars.current;
    const data=new Uint8Array(32);let frame=0;
    const tick=()=>{graph.current?.analyser.getByteFrequencyData(data);visual?.querySelectorAll<HTMLElement>('span').forEach((bar,i)=>{bar.style.transform=`scaleY(${Math.max(.12,data[i*3]/255)})`});frame=requestAnimationFrame(tick)};tick();
    return ()=>{cancelAnimationFrame(frame);visual?.querySelectorAll<HTMLElement>('span').forEach(bar=>{bar.style.transform='scaleY(.12)'})};
  },[audio,playing]);
  return <span className="playback-indicator" role="status"><span ref={bars} className="voice-intensity" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i}/>)}</span><span>{label ?? (playing ? "Playing reviewed audio" : "Audio paused")}</span></span>;
}
