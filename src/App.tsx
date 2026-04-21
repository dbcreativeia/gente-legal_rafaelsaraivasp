import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  PawPrint, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Search, 
  Download, 
  AlertCircle,
  Menu,
  X,
  LayoutDashboard,
  ExternalLink,
  Instagram,
  Facebook,
  Lock,
  Upload,
  FileText
} from 'lucide-react';
import { IMaskInput } from 'react-imask';
import * as XLSX from 'xlsx';

import { CIDADES_SP, WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './constants';
import { cn, validateCPF, formatInternationalPhone } from './utils';

// --- Schemas ---

const registrationSchema = z.object({
  name: z.string({ message: "Por favor, preencha o seu nome completo" }).min(3, "Por favor, preencha o seu nome completo"),
  rg: z.string({ message: "Por favor, preencha o seu RG" }).min(5, "Por favor, preencha o seu RG"),
  cpf: z.string({ message: "Por favor, preencha o seu CPF" }).refine(validateCPF, "Por favor, preencha um CPF válido"),
  cep: z.string({ message: "Por favor, preencha o seu CEP" }).min(8, "Por favor, preencha o seu CEP"),
  street: z.string({ message: "Por favor, preencha o nome da sua rua" }).min(1, "Por favor, preencha o nome da sua rua"),
  number: z.string({ message: "Por favor, preencha o número do seu endereço" }).min(1, "Por favor, preencha o número do seu endereço"),
  complement: z.string().optional(),
  neighborhood: z.string({ message: "Por favor, preencha o seu bairro" }).min(1, "Por favor, preencha o seu bairro"),
  city: z.string({ message: "Por favor, selecione a sua cidade" }).min(1, "Por favor, selecione a sua cidade"),
  phone: z.string().optional(),
  whatsapp: z.string({ message: "Por favor, preencha o seu WhatsApp" }).min(10, "Por favor, preencha o seu WhatsApp"),
  email: z.string({ message: "Por favor, preencha o seu e-mail" }).email("Por favor, preencha um e-mail válido"),
  lgpd: z.boolean().refine(val => val === true, "Por favor, aceite a política de privacidade para continuar"),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const qrCodeSchema = z.object({
  name: z.string({ message: "Por favor, preencha o seu nome completo" }).min(3, "Por favor, preencha o seu nome completo"),
  whatsapp: z.string({ message: "Por favor, preencha o seu WhatsApp" }).min(10, "Por favor, preencha o seu WhatsApp"),
});

type QRCodeForm = z.infer<typeof qrCodeSchema>;

// --- Components ---

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; required?: boolean }>(
  ({ label, error, required, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-dark/80">
        {label} {required && <span className="text-brand-orange">*</span>}
      </label>
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark placeholder:text-dark/30",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
);

const MaskedInput = React.forwardRef<any, any>(
  ({ label, error, required, mask, onAccept, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-dark/80">
        {label} {required && <span className="text-brand-orange">*</span>}
      </label>
      <IMaskInput
        mask={mask}
        unmask={true}
        onAccept={onAccept}
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark placeholder:text-dark/30",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
);

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; required?: boolean }>(
  ({ label, error, required, children, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-sm font-medium text-dark/80">
        {label} {required && <span className="text-brand-orange">*</span>}
      </label>
      <select
        ref={ref}
        className={cn(
          "w-full px-4 py-3 rounded-xl border border-dark/10 bg-white focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark appearance-none",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  )
);

// --- Pages ---



// Helper function to handle API requests
const API_BASE_URL = 'https://gentelegal.rafaelsaraivasp.com.br';

const safeFetch = async (url: string, options?: RequestInit) => {
  const fetchUrl = url.startsWith('/api/') ? `${API_BASE_URL}${url}` : url;
  return fetch(fetchUrl, options);
};

function LandingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'whatsapp' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      lgpd: false,
    }
  });



  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      setCepLoading(true);
      try {
        const response = await safeFetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('street', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          
          // Dispara o evento no Google Analytics
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'cep_preenchido_adesivo', {
              event_category: 'Formulário',
              event_label: 'CEP Preenchido',
              city: data.localidade
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const onSubmit = async (data: RegistrationForm) => {
    // Dispara o evento no Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'tentativa_cadastro_adesivo', {
        event_category: 'Formulário',
        event_label: 'Tentativa de Cadastro'
      });
    }
    
    setLoading(true);
    try {
      const response = await safeFetch('/api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: {
            ...data,
            phone: data.phone ? formatInternationalPhone(data.phone) : null,
            whatsapp: formatInternationalPhone(data.whatsapp),
          }
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Dispara o evento de CompleteRegistration no Pixel (Frontend) com o mesmo event_id do backend
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'CompleteRegistration', { content_name: 'Adesivo' }, { eventID: 'reg_' + result.id });
        }
        // Dispara o evento no Google Analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'cadastro_adesivo_sucesso', {
            currency: 'BRL',
            value: 0,
            event_category: 'Cadastro',
            event_label: 'Adesivo'
          });
        }
        if (result.warning) {
          alert(result.warning);
        }
        setStep('whatsapp');
        reset();
        window.scrollTo(0, 0);
        setLoading(false);
      } else {
        alert(result.error || "Erro ao enviar cadastro. Tente novamente.");
        setLoading(false);
      }
    } catch (error) {
      alert("Erro ao enviar cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    // Dispara o evento no Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'clique_whatsapp_adesivo', {
        event_category: 'Contato',
        event_label: 'Botão WhatsApp Final'
      });
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
    setStep('success');
  };

  if (step === 'whatsapp') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-4 border-secondary"
        >
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
            <CheckCircle2 className="w-10 h-10 text-dark" />
          </div>
          <h2 className="text-4xl font-display italic font-bold text-dark mb-4 uppercase tracking-tight leading-none">Falta apenas um passo!</h2>
          <p className="text-dark/70 mb-8 font-medium">
            Para concluir o cadastro: <br />
            👉 Clique no botão abaixo e envie uma mensagem no nosso WhatsApp.
          </p>
          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-brand-orange hover:bg-dark text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-orange/30 text-lg uppercase tracking-wider"
          >
            Confirmar no WhatsApp
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-4 border-accent"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-secondary/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-display italic font-bold text-dark mb-4 uppercase tracking-tight leading-none">Cadastro Sucesso!</h2>
          <p className="text-dark/70 mb-6 font-medium">
            Salve nosso número de WhatsApp para receber:
          </p>
          <ul className="text-left space-y-3 mb-8 text-dark/80 font-medium">
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-secondary rounded-full" />
              Avisos importantes
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-brand-orange rounded-full" />
              Ações e campanhas
            </li>
            <li className="flex items-center gap-3">
              <div className="w-3 h-3 bg-accent rounded-full" />
              Defesa ativa dos animais
            </li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-dark hover:bg-secondary text-white font-black py-4 px-6 rounded-2xl transition-all uppercase tracking-wider"
          >
            Voltar ao início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-0">
      {/* Header - Increased top padding and fixed spacing */}
      <header className="bg-gradient-to-br from-dark via-secondary to-primary text-white pt-6 md:pt-8 lg:pt-10 pb-0 px-0 relative overflow-hidden z-10">
        {/* Standard Campaign Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden mix-blend-overlay">
          <img 
            src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
            alt="Texture" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-20">
          <div className="relative">
            {/* Logo centered on the entire screen */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pt-2 mb-6 md:mb-8 flex justify-center w-full relative z-40"
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1M6hf4eQkOkt7qiVd6RqR_akBOzSKs2Qd" 
                alt="Logo Rafael Saraiva" 
                className="h-14 md:h-16 lg:h-20 w-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Headline Area */}
            <div className="text-center md:text-left pb-2 md:pb-24 lg:pb-32 relative z-30 w-full md:w-[55%] lg:w-[60%] pr-0 md:pr-8">
              <motion.div
                initial={{ opacity: 0, scale: 1.8, rotate: 15, y: -40 }}
                whileInView={{ opacity: 1, scale: 1, rotate: -3, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", bounce: 0.5, duration: 1.5, delay: 0.3 }}
                className="flex justify-center md:justify-start relative z-50"
              >
                <img 
                  src="https://lh3.googleusercontent.com/d/12zdLm_zjNUb1w1GUlf8LZ05uFsN3zt_9" 
                  alt="Gente Legal Não Maltrata Animal" 
                  className="w-full max-w-[280px] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[500px] h-auto drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              <motion.div className="mt-6 space-y-3 text-center md:text-left max-w-2xl">
                <p className="text-lg md:text-xl text-white/90 font-medium">
                  Solicite gratuitamente seu adesivo e ajude a espalhar essa mensagem.
                </p>
                <p className="text-xl md:text-xl lg:text-2xl font-bold text-accent">
                  Quem maltrata animal revela exatamente quem é.
                </p>
                <p className="text-base md:text-lg text-white/80">
                  Aqui a regra é clara: respeito, responsabilidade e proteção.<br />
                  Se você acredita que política também é defender quem não tem voz, este é o seu lugar.
                </p>
              </motion.div>
            </div>

            {/* Rafael Photo - Desktop/Tablet (Positioned to the right, behind everything) */}
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="hidden md:block absolute top-0 right-0 z-10 h-full w-1/2 pointer-events-none"
            >
              <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full transform scale-[0.8] translate-y-20 translate-x-10 z-0" />
              <img 
                src="https://lh3.googleusercontent.com/d/1_jNkZVR-6vfczpyAwbyU4LmH-n-6fdZh" 
                alt="Rafael Saraiva" 
                className="h-full w-full object-contain object-right-bottom relative z-10 drop-shadow-[0_0_60px_rgba(0,177,253,0.3)] brightness-105 contrast-105"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>

        {/* Mobile Photo - Below Castrometro */}
        <div className="px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:hidden flex justify-center mt-2 relative z-10"
          >
            <div className="absolute inset-0 bg-primary/30 blur-[60px] rounded-full transform scale-75 translate-y-10 z-0" />
            <img 
              src="https://lh3.googleusercontent.com/d/1_jNkZVR-6vfczpyAwbyU4LmH-n-6fdZh" 
              alt="Rafael Saraiva Mobile" 
              className="max-h-[320px] w-auto object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,177,253,0.3)] brightness-105 contrast-105 relative z-10"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        {/* Gradient Transition to Form */}
        <div className="absolute bottom-0 left-0 w-full h-32 md:h-48 bg-gradient-to-t from-paper to-transparent z-20 pointer-events-none" />
      </header>

      {/* Form Container */}
      <main className="max-w-2xl mx-auto px-4 -mt-12 md:-mt-20 lg:-mt-24 relative z-50">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
          
          {/* Section: Responsável */}
          <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-8 border-secondary space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/20">
                  <User size={24} />
                </div>
                <h2 className="text-3xl font-display italic font-bold text-dark uppercase tracking-tight leading-none">Seus Dados</h2>
              </div>
              <div className="inline-flex items-center gap-2 bg-dark/5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-dark/40 border border-dark/10">
                <span className="text-brand-orange font-black text-lg leading-none">*</span>
                <span>Campos obrigatórios</span>
              </div>
            </div>

            <Input label="Nome Completo" required {...register('name')} error={errors.name?.message} placeholder="Ex: João Silva" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="RG" required {...register('rg')} error={errors.rg?.message} placeholder="00.000.000-0" />
              <MaskedInput 
                label="CPF" 
                required
                mask="000.000.000-00" 
                onAccept={(val: string) => setValue('cpf', val)} 
                error={errors.cpf?.message} 
                placeholder="000.000.000-00"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MaskedInput 
                label="WhatsApp" 
                required
                mask="(00) 00000-0000" 
                onAccept={(val: string) => setValue('whatsapp', val)} 
                error={errors.whatsapp?.message} 
                placeholder="(11) 99999-9999"
              />
              <MaskedInput 
                label="Telefone (Opcional)" 
                mask="(00) 0000-0000" 
                onAccept={(val: string) => setValue('phone', val)} 
                error={errors.phone?.message} 
                placeholder="(11) 4444-4444"
              />
            </div>

            <Input label="E-mail" required type="email" {...register('email')} error={errors.email?.message} placeholder="seu@email.com" />
          </section>

          {/* Section: Endereço */}
          <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-8 border-accent space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-accent text-dark rounded-2xl shadow-lg shadow-accent/20">
                <MapPin size={24} />
              </div>
              <h2 className="text-3xl font-display italic font-bold text-dark uppercase tracking-tight leading-none">Endereço</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MaskedInput 
                label="CEP" 
                required
                mask="00000-000" 
                onAccept={(val: string) => setValue('cep', val)} 
                onBlur={handleCepBlur}
                error={errors.cep?.message} 
                placeholder="00000-000"
              />
              <Select label="Cidade" required {...register('city')} error={errors.city?.message}>
                <option value="">Selecione a cidade</option>
                {CIDADES_SP.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3">
                <Input label="Rua" required {...register('street')} error={errors.street?.message} placeholder="Nome da rua" />
              </div>
              <Input label="Número" required {...register('number')} error={errors.number?.message} placeholder="123" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Bairro" required {...register('neighborhood')} error={errors.neighborhood?.message} placeholder="Seu bairro" />
              <Input label="Complemento" {...register('complement')} error={errors.complement?.message} placeholder="Apto, Bloco..." />
            </div>
          </section>


          {/* Consent */}
          <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-dark/5">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox" 
                {...register('lgpd')} 
                className="mt-1 w-6 h-6 rounded border-dark/20 text-secondary focus:ring-secondary transition-all cursor-pointer"
              />
              <span className="text-sm text-dark/70 leading-relaxed font-medium group-hover:text-dark transition-colors">
                Declaro que li e concordo com a <button type="button" onClick={(e) => { e.preventDefault(); navigate('/privacidade'); }} className="text-secondary font-bold underline decoration-2 underline-offset-4">Política de Privacidade</button> e autorizo o uso dos meus dados para receber o adesivo e comunicações sobre ações, campanhas e avisos relacionados à defesa dos animais e do mandato do Deputado Estadual Rafael Saraiva.
              </span>
            </label>
            {errors.lgpd && <p className="text-xs text-red-500 font-bold mt-3 flex items-center gap-1"><AlertCircle size={14} /> {errors.lgpd.message}</p>}
          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary hover:bg-brand-orange disabled:bg-secondary/50 text-white font-black py-6 px-8 rounded-[2rem] text-2xl shadow-2xl shadow-secondary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest"
          >
            {loading ? "Processando..." : "QUERO RECEBER MEU ADESIVO"}
            {!loading && <ArrowRight className="w-8 h-8" />}
          </button>
        </form>
      </main>

      <footer className="mt-8 px-6 pb-6">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto bg-white rounded-[3rem] p-8 md:p-16 shadow-2xl border-2 border-dark/5 mb-8 relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start relative z-10">
            <div className="lg:col-span-4 flex justify-center lg:justify-start">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-secondary rounded-[3rem] rotate-6 -z-10" />
                <div className="w-48 h-64 md:w-56 md:h-72 lg:w-64 lg:h-80 rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl">
                  <img 
                    src="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" 
                    alt="Rafael Saraiva Bio" 
                    className="w-full h-full object-cover"
                    style={{ objectPosition: '50% 15%' }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-8 space-y-6 md:space-y-8 text-center lg:text-left">
              <div className="flex flex-col items-center lg:items-start">
                <span className="text-secondary font-black uppercase tracking-[0.2em] text-xs mb-2 block">Trajetória e Compromisso</span>
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-display italic font-black text-dark uppercase tracking-tight leading-none">Rafael Saraiva</h3>
              </div>
              
              <div className="space-y-4 text-dark/80 leading-relaxed font-medium text-base md:text-lg text-left md:text-justify">
                <p>
                  <strong className="text-secondary">Deputado Estadual por São Paulo</strong>, advogado e um dos mais expressivos ativistas na defesa e proteção dos animais no Brasil. Eleito em 2022 com <span className="bg-accent/30 px-1 rounded">98.070 votos</span>, Rafael transformou seu mandato em uma trincheira contra os maus-tratos.
                </p>
                <p>
                  Sua atuação é marcada pela criação de políticas públicas inovadoras e pela defesa intransigente de uma convivência justa entre pessoas e animais. Além da causa animal, Rafael lidera pautas fundamentais de segurança, cidadania e bem-estar social, sempre buscando fortalecer a legislação e ampliar a conscientização sobre o respeito à vida em todas as suas formas.
                </p>
              </div>
              
              <div className="pt-6 space-y-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-dark/30">Acompanhe nosso trabalho</span>
                  <div className="h-px w-12 bg-dark/10" />
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <motion.a 
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://instagram.com/rafaelsaraivasp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-pink-500/20 transition-all text-sm uppercase tracking-wider"
                  >
                    <Instagram size={20} /> Instagram
                  </motion.a>
                  <motion.a 
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://facebook.com/rafaelsaraivasp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none bg-[#1877F2] text-white font-black py-4 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all text-sm uppercase tracking-wider"
                  >
                    <Facebook size={20} /> Facebook
                  </motion.a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="text-center text-dark/40 text-sm">
          <div className="flex flex-col items-center justify-center gap-6 mb-8">
            <button 
              onClick={() => navigate('/privacidade')}
              className="text-[10px] font-black uppercase tracking-[0.2em] hover:text-secondary transition-colors border-b border-dark/10 pb-1"
            >
              Política de Privacidade
            </button>
            <div className="flex items-center gap-4 opacity-50">
              <div className="h-px w-12 bg-dark/20" />
              <PawPrint size={24} />
              <div className="h-px w-12 bg-dark/20" />
            </div>
          </div>
          <p className="font-bold uppercase tracking-widest">© 2026 Deputado Rafael Saraiva</p>
          <p className="mt-1 font-medium">Gente legal não maltrata animal!</p>
        </div>
      </footer>
    </div>
  );
}

function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [isImporting, setIsImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const downloadTemplate = () => {
    const templateData = [
      {
        "Status": "Ativo",
        "Nome Responsável": "João da Silva",
        "RG": "12.345.678-9",
        "CPF": "123.456.789-00",
        "CEP": "12345-678",
        "Endereço (Rua)": "Rua das Flores",
        "Número": "123",
        "Complemento": "Apto 4",
        "Bairro": "Centro",
        "Cidade": "São Paulo",
        "Estado": "SP",
        "Telefone": "(11) 98765-4321",
        "WhatsApp": "(11) 98765-4321",
        "E-mail": "joao@email.com"
      },
      {
        "Status": "Ativo",
        "Nome Responsável": "Maria Oliveira",
        "RG": "98.765.432-1",
        "CPF": "987.654.321-00",
        "CEP": "04567-890",
        "Endereço (Rua)": "Av. Paulista",
        "Número": "1000",
        "Complemento": "",
        "Bairro": "Bela Vista",
        "Cidade": "São Paulo",
        "Estado": "SP",
        "Telefone": "",
        "WhatsApp": "(11) 97777-6666",
        "E-mail": "maria@email.com"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const res = await safeFetch('/api/import.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': sessionStorage.getItem('admin_token') || '',
          'Authorization': sessionStorage.getItem('admin_token') || ''
        },
        body: JSON.stringify(jsonData)
      });

      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchRegistrations(); // Reload data
      } else {
        alert('Erro: ' + result.message);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao processar o arquivo.');
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await safeFetch('/api/registrations.php', {
        headers: {
          'X-Admin-Password': passwordInput,
          'Authorization': passwordInput
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth', 'true');
        sessionStorage.setItem('admin_token', passwordInput);
        setLoginError('');
      } else if (res.status === 401) {
        setLoginError('Senha incorreta');
      } else {
        setLoginError(`Erro do servidor: ${res.status} - O backend pode não estar rodando.`);
      }
    } catch (error) {
      console.error(error);
      setLoginError('Erro ao conectar. Se o erro persistir, o servidor backend pode não estar rodando corretamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await safeFetch('/api/registrations.php', {
        headers: {
          'X-Admin-Password': token,
          'Authorization': token
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_auth');
        sessionStorage.removeItem('admin_token');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await safeFetch('/api/toggle_status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token || ''
        },
        body: JSON.stringify({
          id,
          is_cancelled: !currentStatus
        })
      });

      if (res.ok) {
        setRegistrations(prev => prev.map(r => 
          r.id === id ? { ...r, is_cancelled: !currentStatus } : r
        ));
      } else {
        alert('Erro ao atualizar status.');
      }
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      alert('Erro ao atualizar status.');
    }
  };

  const deleteRegistration = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este cadastro? Esta ação não pode ser desfeita.')) return;
    
    try {
      const token = sessionStorage.getItem('admin_token');
      const res = await safeFetch(`/api/registrations.php?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token || ''
        }
      });

      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== id));
      } else {
        alert('Erro ao excluir cadastro.');
      }
    } catch (error) {
      console.error('Erro ao excluir cadastro', error);
      alert('Erro ao excluir cadastro.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-dark/5">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-display italic font-black text-center text-dark mb-2 uppercase tracking-tight">Área Restrita</h1>
          <p className="text-center text-dark/60 mb-8 text-sm">Digite a senha para acessar o painel administrativo.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:ring-0 transition-colors"
                placeholder="Senha de acesso"
                autoFocus
              />
            </div>
            {loginError && <p className="text-red-500 text-sm font-bold text-center">{loginError}</p>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-70"
            >
              {loading ? 'Verificando...' : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = registrations.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cpf.includes(search) ||
      r.whatsapp.includes(search) ||
      r.city.toLowerCase().includes(search.toLowerCase());
    
    const matchesCity = !filterCity || r.city === filterCity;
    const matchesStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? !r.is_cancelled : r.is_cancelled;

    return matchesSearch && matchesCity && matchesStatus;
  });

  const exportToExcel = () => {
    const exportData: any[] = [];
    filtered.forEach(r => {
      exportData.push({
        "Status": r.is_cancelled ? 'Cancelado' : 'Ativo',
        "Nome Responsável": r.name,
        "RG": r.rg,
        "CPF": r.cpf,
        "CEP": r.cep,
        "Endereço (Rua)": r.street,
        "Número": r.number,
        "Complemento": r.complement || '',
        "Bairro": r.neighborhood,
        "Cidade": r.city,
        "Estado": r.state || 'SP',
        "Telefone": r.phone || '-',
        "WhatsApp": r.whatsapp,
        "E-mail": r.email,
        "Data Cadastro": new Date(r.created_at).toLocaleString('pt-BR')
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cadastros");
    XLSX.writeFile(wb, `cadastros_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-paper">
      <nav className="bg-white border-b border-dark/10 px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-dark rounded-lg text-white">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="font-display italic font-bold text-dark text-xl md:text-2xl uppercase tracking-tight text-center md:text-left">Dashboard Administrativo</h1>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <button 
            onClick={downloadTemplate}
            className="bg-gray-100 hover:bg-gray-200 text-dark px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all"
            title="Baixar planilha modelo para importação"
          >
            <FileText size={16} /> Modelo
          </button>
          <label className={`bg-primary hover:bg-primary/90 text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={16} /> {isImporting ? 'Importando...' : 'Importar'}
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={handleImport}
              disabled={isImporting}
            />
          </label>
          <button 
            onClick={exportToExcel}
            className="bg-secondary hover:bg-dark text-white px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Download size={16} /> Exportar
          </button>
          <button 
            onClick={() => {
              sessionStorage.removeItem('admin_auth');
              sessionStorage.removeItem('admin_token');
              setIsAuthenticated(false);
            }}
            className="bg-gray-100 hover:bg-gray-200 text-dark px-3 py-2 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all"
          >
            Sair
          </button>
        </div>
      </nav>

      <main className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-dark/5">
            <p className="text-dark/50 text-sm font-medium mb-1">Total de Cadastros</p>
            <p className="text-3xl font-black text-dark">{filtered.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-dark/5 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/30" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, CPF, WhatsApp ou cidade..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-dark/10 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-3 rounded-xl border border-dark/10 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option key="all" value="all">Todos os Status</option>
            <option key="active" value="active">Apenas Ativos</option>
            <option key="cancelled" value="cancelled">Apenas Cancelados</option>
          </select>
          <select 
            className="px-4 py-3 rounded-xl border border-dark/10 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all text-dark"
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
          >
            <option key="default" value="">Todas as Cidades (Endereço)</option>
            {Array.from(new Set(registrations.map(r => r.city))).sort().map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        {selectedIds.length > 0 && (
          <button
            onClick={async () => {
              for (const id of selectedIds) {
                await deleteRegistration(id);
              }
              setSelectedIds([]);
              fetchRegistrations();
            }}
            className="mb-4 px-4 py-2 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
          >
            Excluir {selectedIds.length} Selecionados
          </button>
        )}
        <div className="bg-white rounded-3xl shadow-sm border border-dark/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-paper border-b border-dark/10">
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filtered.map(r => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Responsável</th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Documentos</th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Localização</th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-dark/50 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark/5">
                {filtered.map((r) => (
                  <tr key={r.id} className={cn("hover:bg-paper transition-colors", r.is_cancelled && "opacity-50")}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, r.id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== r.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-dark flex items-center gap-2">
                          {r.name}
                          {r.is_cancelled && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                              Cancelado
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-dark/50">{r.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-dark/70">
                        <span>CPF: {r.cpf}</span>
                        <span>RG: {r.rg}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-dark/70">
                        <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" className="text-secondary font-bold flex items-center gap-1 hover:underline">
                          {r.whatsapp} <ExternalLink size={12} />
                        </a>
                        {r.phone && <span>Tel: {r.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm text-dark/70">
                        <span className="font-bold text-dark">{r.city}</span>
                        <span className="text-xs">{r.street}, {r.number}</span>
                        <span className="text-xs">{r.neighborhood} - {r.cep}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark/50">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(r.id, r.is_cancelled)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                            r.is_cancelled 
                              ? "bg-green-100 text-green-700 hover:bg-green-200" 
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          )}
                        >
                          {r.is_cancelled ? 'Reativar' : 'Cancelar'}
                        </button>
                        <button
                          onClick={() => deleteRegistration(r.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-dark/30">
              Nenhum cadastro encontrado.
            </div>
          )}
        </div>
      </main>

    </div>
  );
}

function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-paper p-8 md:p-20">
      <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-10 md:p-20 shadow-2xl border-2 border-dark/5">
        <button 
          onClick={() => navigate('/')}
          className="mb-10 text-secondary font-black flex items-center gap-2 uppercase tracking-widest text-sm hover:translate-x-[-4px] transition-transform"
        >
          <ArrowRight className="rotate-180" size={20} /> Voltar
        </button>
        <h1 className="text-4xl md:text-5xl font-display italic font-black text-dark mb-4 uppercase tracking-tight">Política de Privacidade e Proteção de Dados</h1>
        <p className="text-dark/40 text-sm mb-10 font-bold uppercase tracking-widest">Última atualização: 10 de Março de 2026</p>
        
        <div className="prose prose-lg text-dark/70 font-medium space-y-8">
          <section className="space-y-4">
            <p>Esta Política de Privacidade explica como os dados pessoais coletados neste site são utilizados no processo de solicitação do adesivo e para comunicações relacionadas às atividades do Deputado Estadual Rafael Saraiva.</p>
            <p>Ao preencher e enviar o formulário deste site, você concorda com os termos descritos nesta política.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">1. Dados coletados</h2>
            <p>Durante o cadastro poderão ser coletadas as seguintes informações:</p>
            <div className="bg-paper/50 p-6 rounded-2xl border border-dark/5 space-y-4">
              <div>
                <p className="font-bold text-dark uppercase text-xs tracking-widest mb-2">Dados do responsável</p>
                <ul className="list-disc list-inside grid grid-cols-1 md:grid-cols-2 gap-1">
                  <li>Nome completo</li>
                  <li>RG</li>
                  <li>CPF</li>
                  <li>Endereço completo</li>
                  <li>Cidade</li>
                  <li>Telefone</li>
                  <li>WhatsApp</li>
                  <li>E-mail</li>
                </ul>
              </div>
            </div>
            <p className="text-sm italic">Essas informações são fornecidas diretamente pelo usuário no momento do cadastro.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">2. Finalidade da coleta dos dados</h2>
            <p>Os dados coletados poderão ser utilizados para:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>realizar o cadastro para recebimento do adesivo</li>
              <li>organizar e gerenciar o envio de materiais da campanha</li>
              <li>entrar em contato com os participantes para envio de informações sobre a campanha</li>
              <li>comunicar atualizações, datas e informações relevantes relacionadas à campanha</li>
            </ul>
            <p>Além disso, os dados também poderão ser utilizados para:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>envio de informações sobre ações, projetos e atividades do mandato do Deputado Estadual Rafael Saraiva</li>
              <li>comunicação institucional por meio de WhatsApp, e-mail, SMS ou outros canais digitais</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">3. Compartilhamento de dados</h2>
            <p>Os dados poderão ser compartilhados, quando necessário, com:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>equipes responsáveis pela organização da campanha</li>
              <li>parceiros institucionais que participem da execução da campanha</li>
            </ul>
            <p>O compartilhamento será sempre limitado às informações necessárias para a realização das atividades relacionadas à campanha ou às ações institucionais.</p>
            <p className="font-bold text-secondary">Em nenhuma hipótese os dados serão vendidos ou comercializados.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">4. Armazenamento e segurança dos dados</h2>
            <p>As informações coletadas são armazenadas em ambiente digital protegido e utilizadas apenas para as finalidades descritas nesta política.</p>
            <p>São adotadas medidas técnicas e administrativas para proteger os dados contra:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>acessos não autorizados</li>
              <li>vazamentos</li>
              <li>perda ou alteração indevida de informações</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">5. Direitos do titular dos dados</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), o titular dos dados tem direito de:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>confirmar a existência de tratamento de dados</li>
              <li>acessar seus dados pessoais</li>
              <li>solicitar correção de dados incompletos, inexatos ou desatualizados</li>
              <li>solicitar a exclusão de seus dados quando aplicável</li>
              <li>obter informações sobre o compartilhamento de seus dados</li>
            </ul>
            <p>Caso deseje exercer algum desses direitos, o titular poderá entrar em contato pelos canais oficiais do mandato.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">6. Consentimento</h2>
            <p>Ao marcar a opção de consentimento e enviar o formulário, o usuário declara que:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>leu e compreendeu esta Política de Privacidade</li>
              <li>autoriza o tratamento de seus dados pessoais para as finalidades descritas</li>
              <li>concorda em receber comunicações relacionadas à campanha e também informações sobre as atividades, projetos e ações do mandato do Deputado Estadual Rafael Saraiva</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">7. Alterações nesta política</h2>
            <p>Esta Política de Privacidade poderá ser atualizada a qualquer momento para refletir melhorias ou alterações no funcionamento do site, da campanha ou das atividades institucionais.</p>
            <p>Recomendamos que os usuários revisem este documento periodicamente.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">8. Contato</h2>
            <p>Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados pessoais, o titular poderá entrar em contato pelos canais oficiais do Deputado Estadual Rafael Saraiva.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function QRCodePage() {
  const [step, setStep] = useState<'form' | 'whatsapp' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<QRCodeForm>({
    resolver: zodResolver(qrCodeSchema),
  });

  const onSubmit = async (data: QRCodeForm) => {
    setLoading(true);
    // Simulating a small delay
    setTimeout(() => {
      setStep('whatsapp');
      setLoading(false);
    }, 500);
  };

  const handleWhatsAppClick = () => {
    const message = "Olá! Quero receber meu adesivo oficial da campanha Gente Legal Não Maltrata Animal do Deputado Estadual Rafael Saraiva.";
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setStep('success');
  };

  if (step === 'whatsapp') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-4 border-secondary"
        >
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
            <CheckCircle2 className="w-10 h-10 text-dark" />
          </div>
          <h2 className="text-4xl font-display italic font-bold text-dark mb-4 uppercase tracking-tight leading-none">Falta apenas um passo!</h2>
          <p className="text-dark/70 mb-8 font-medium">
            Para concluir sua confirmação: <br />
            👉 Clique no botão abaixo e envie a mensagem no nosso WhatsApp.
          </p>
          <button
            onClick={handleWhatsAppClick}
            className="w-full bg-brand-orange hover:bg-dark text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-brand-orange/30 text-lg uppercase tracking-wider"
          >
            Confirmar no WhatsApp
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-4 border-accent"
        >
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-secondary/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-display italic font-bold text-dark mb-4 uppercase tracking-tight leading-none">Solicitação Confirmada!</h2>
          <p className="text-dark/70 mb-6 font-medium">
            Obrigado por solicitar seu adesivo. Nos vemos na campanha!
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-dark hover:bg-secondary text-white font-black py-4 px-6 rounded-2xl transition-all uppercase tracking-wider"
          >
            Voltar ao início
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-0">
      <header className="bg-gradient-to-br from-dark via-secondary to-primary text-white pt-8 md:pt-12 lg:pt-16 pb-0 px-0 relative overflow-hidden z-10">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden mix-blend-overlay">
          <img 
            src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
            alt="Texture" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-20">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="pt-4 mb-8 md:mb-10 flex justify-center w-full relative z-40"
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1M6hf4eQkOkt7qiVd6RqR_akBOzSKs2Qd" 
                alt="Logo Rafael Saraiva" 
                className="h-16 md:h-20 lg:h-24 w-auto"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <div className="text-center md:text-left pb-2 md:pb-36 lg:pb-48 relative z-30 w-full md:w-[55%] lg:w-[60%] pr-0 md:pr-8">
              <motion.div
                initial={{ opacity: 0, scale: 1.8, rotate: 15, y: -40 }}
                whileInView={{ opacity: 1, scale: 1, rotate: -3, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", bounce: 0.5, duration: 1.5, delay: 0.3 }}
                className="flex justify-center md:justify-start relative z-50"
              >
                <img 
                  src="https://lh3.googleusercontent.com/d/12zdLm_zjNUb1w1GUlf8LZ05uFsN3zt_9" 
                  alt="Gente Legal Não Maltrata Animal" 
                  className="w-full max-w-[280px] md:max-w-[360px] lg:max-w-[420px] xl:max-w-[500px] h-auto drop-shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="hidden md:block absolute top-0 right-0 z-10 h-full w-1/2 pointer-events-none"
            >
              <div className="absolute inset-0 bg-primary/30 blur-[100px] rounded-full transform scale-[0.8] translate-y-20 translate-x-10 z-0" />
              <img 
                src="https://lh3.googleusercontent.com/d/1_jNkZVR-6vfczpyAwbyU4LmH-n-6fdZh" 
                alt="Rafael Saraiva" 
                className="h-full w-full object-contain object-right-bottom relative z-10 drop-shadow-[0_0_60px_rgba(0,177,253,0.3)] brightness-105 contrast-105"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>

        <div className="px-6">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:hidden flex justify-center mt-2 relative z-10"
          >
            <div className="absolute inset-0 bg-primary/30 blur-[60px] rounded-full transform scale-75 translate-y-10 z-0" />
            <img 
              src="https://lh3.googleusercontent.com/d/1_jNkZVR-6vfczpyAwbyU4LmH-n-6fdZh" 
              alt="Rafael Saraiva Mobile" 
              className="max-h-[320px] w-auto object-contain object-bottom drop-shadow-[0_0_40px_rgba(0,177,253,0.3)] brightness-105 contrast-105 relative z-10"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-32 md:h-48 bg-gradient-to-t from-paper to-transparent z-20 pointer-events-none" />
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-12 md:-mt-28 lg:-mt-36 relative z-50">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
          <section className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-2xl border-t-8 border-secondary space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/20">
                  <User size={24} />
                </div>
                <h2 className="text-3xl font-display italic font-bold text-dark uppercase tracking-tight leading-none">Confirmação</h2>
              </div>
            </div>

            <Input label="Nome Completo" required {...register('name')} error={errors.name?.message} placeholder="Ex: João Silva" />
            
            <MaskedInput 
              label="WhatsApp" 
              required
              mask="(00) 00000-0000" 
              onAccept={(val: string) => setValue('whatsapp', val)} 
              error={errors.whatsapp?.message} 
              placeholder="(11) 99999-9999"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-dark text-white font-black py-5 px-8 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-brand-orange/40 text-xl uppercase tracking-widest group disabled:opacity-70"
            >
              {loading ? "Enviando..." : "Enviar Confirmação"}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/privacidade" element={<PrivacyPolicy />} />
        <Route path="/qrcode" element={<QRCodePage />} />
      </Routes>
    </HashRouter>
  );
}
