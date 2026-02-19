import React, { useState, useEffect } from 'react';
import { PlayCircle, Clock, BookOpen, Lock, X, Play, Share2, Loader2 } from 'lucide-react';
import { Lesson } from '../types';
import { supabase } from '../lib/supabase';

const Academy: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB fields to Types
      const mappedLessons: Lesson[] = (data || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        duration: l.duration,
        category: l.category,
        thumbnail: l.thumbnail || `https://picsum.photos/seed/${l.id}/400/225`
      }));

      setLessons(mappedLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 relative">
      {/* Featured Header */}
      <div className="bg-gradient-to-r from-zinc-900 to-[#1e1e24] border border-brand-border rounded-2xl p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold opacity-5 rounded-full filter blur-[100px] transform translate-x-1/2 -translate-y-1/2 group-hover:opacity-10 transition-opacity duration-1000"></div>
        
        <div className="relative z-10 max-w-2xl">
          <span className="text-brand-gold font-bold tracking-widest text-xs uppercase mb-3 block font-serif">NG.Academy</span>
          <h1 className="text-5xl font-serif font-bold text-white mb-6 leading-tight">Masterclass:<br/> Escala & Equity</h1>
          <p className="text-zinc-400 text-lg mb-8 font-light">
            Aprenda com os maiores players do mercado como preparar sua empresa para M&A e rodadas de investimento.
          </p>
          <button className="bg-brand-gold text-black font-bold px-8 py-4 rounded-lg hover:bg-[#c5a059] transition-all flex items-center gap-3 shadow-[0_0_25px_rgba(212,175,55,0.2)] hover:shadow-[0_0_35px_rgba(212,175,55,0.4)] hover:scale-105 duration-300">
            <PlayCircle className="w-5 h-5" />
            Continuar Assistindo
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif font-bold text-white">Módulos Recentes</h2>
          <div className="flex gap-2">
            {['Todos', 'Gestão', 'Marketing', 'Finanças'].map((cat, i) => (
              <button 
                key={i} 
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${i === 0 ? 'bg-brand-gold text-black border-brand-gold' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lessons.length === 0 ? (
               <div className="col-span-3 text-center py-10 text-zinc-500 italic">Nenhuma aula disponível no momento.</div>
            ) : (
              lessons.map((lesson) => (
                <div 
                  key={lesson.id} 
                  className="group cursor-pointer"
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <div className="relative rounded-xl overflow-hidden aspect-video mb-4 border border-brand-border group-hover:border-brand-gold/30 transition-colors">
                    <img src={lesson.thumbnail} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter saturate-0 group-hover:saturate-100" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 text-white ml-1 fill-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded border border-zinc-800 uppercase tracking-wide">
                      {lesson.duration}
                    </div>
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block mb-1">{lesson.category}</span>
                      <h3 className="text-white font-serif font-medium text-lg group-hover:text-brand-gold transition-colors leading-tight">
                        {lesson.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Locked Content Placeholder - Static for upsell */}
            <div className="group relative rounded-xl border border-brand-border border-dashed bg-zinc-900/20 flex flex-col items-center justify-center aspect-video p-6 text-center hover:bg-zinc-900/40 transition-colors">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
                <Lock className="w-5 h-5 text-zinc-500" />
              </div>
              <h3 className="text-zinc-300 font-serif font-medium mb-1 text-lg">Módulo Premium</h3>
              <p className="text-zinc-500 text-xs">Disponível apenas para membros Black.</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal Overlay */}
      {selectedLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
          <button 
            onClick={() => setSelectedLesson(null)} 
            className="absolute top-8 right-8 text-zinc-400 hover:text-white transition-colors hover:rotate-90 duration-300"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative group ring-1 ring-zinc-800">
                {/* Mock Video Player UI */}
                <img src={selectedLesson.thumbnail} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <PlayCircle className="w-24 h-24 text-white opacity-90 group-hover:scale-105 transition-transform cursor-pointer drop-shadow-xl" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                  <div className="h-full w-1/3 bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]"></div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-serif font-bold text-white mb-3">{selectedLesson.title}</h1>
                <div className="flex items-center gap-6 text-sm text-zinc-400 border-b border-zinc-800 pb-6 mb-6">
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-gold" /> {selectedLesson.duration}</span>
                  <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-gold" /> Material Complementar</span>
                  <button className="ml-auto text-brand-gold hover:text-white transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Share2 className="w-4 h-4" /> Compartilhar</button>
                </div>
                <p className="text-zinc-400 leading-relaxed text-lg font-light">
                  Nesta aula exclusiva, exploramos as dinâmicas fundamentais para o crescimento sustentável de startups em estágio de tração. Prepare-se para anotações intensas.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 h-fit">
               <h3 className="text-white font-serif font-semibold mb-6 text-lg">Próximas Aulas</h3>
               <div className="space-y-4">
                 {lessons.filter(l => l.id !== selectedLesson.id).slice(0, 3).map(l => (
                   <div key={l.id} className="flex gap-4 hover:bg-zinc-800 p-2 rounded-lg cursor-pointer transition-colors group" onClick={() => setSelectedLesson(l)}>
                      <div className="relative w-28 h-16 rounded overflow-hidden">
                        <img src={l.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-zinc-200 line-clamp-2 font-medium group-hover:text-brand-gold transition-colors">{l.title}</p>
                        <span className="text-xs text-zinc-500 mt-1 block">{l.duration}</span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Academy;