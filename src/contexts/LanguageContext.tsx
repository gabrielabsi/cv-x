import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "pt" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Header & Auth
    "auth.login": "Entrar",
    "auth.signup": "Criar conta",
    "auth.logout": "Sair da conta",
    "auth.myAccount": "Minha Conta",
    "auth.syncedHistory": "Histórico sincronizado",
    "auth.user": "Usuário",
    "auth.loginRequired": "Login necessário",
    "auth.loginRequiredDesc": "Faça login ou crie uma conta para assinar um plano.",

    // Hero
    "hero.badge": "Powered by AI",
    "hero.title": "Seu currículo reescrito para",
    "hero.titleHighlight": "passar no ATS",
    "hero.titleEnd": "e chamar entrevista.",
    "hero.subtitle": "Envie seu CV e receba em minutos um diagnóstico + versão otimizada com bullets de impacto e keywords certas para a vaga.",
    "hero.proof1": "Sem enrolação. Sem template genérico.",
    "hero.proof2": "Resultado pronto pra copiar e colar.",

    // Proof Points
    "proof.title": "O CVX te entrega o que recrutador realmente filtra:",
    "proof.ats": "Score ATS e falhas críticas",
    "proof.keywords": "Keywords faltantes por vaga / área",
    "proof.rewrite": "Reescrita profissional (sem inventar dados)",

    // How It Works
    "how.title": "Como funciona",
    "how.step1.title": "Envie seu currículo",
    "how.step1.desc": "PDF ou texto. Se quiser, cole também a Job Description.",
    "how.step2.title": "Receba o diagnóstico",
    "how.step2.desc": "Onde você está perdendo pontos no ATS e no olhar humano.",
    "how.step3.title": "Desbloqueie o CV reescrito (Pro)",
    "how.step3.desc": "Versão final + bullets fortes + estrutura pronta para Word/LinkedIn.",

    // Pro Features
    "pro.title": "O que você recebe",
    "pro.subtitle": "No plano Pro",
    "pro.feature1": "Currículo reescrito com impacto",
    "pro.feature2": "Summary pronto pra LinkedIn",
    "pro.feature3": "Bullets orientados a resultados",
    "pro.feature4": "Skills e keywords recomendadas",
    "pro.feature5": "Checklist do que ajustar (pra subir seu score)",

    // Target Audience
    "target.title": "Para quem é",
    "target.subtitle": "Perfeito pra quem:",
    "target.item1": "Está aplicando para vagas e não recebe resposta",
    "target.item2": "Quer migrar de área e precisa reposicionar o CV",
    "target.item3": "Precisa adaptar CV para uma vaga específica",
    "target.item4": "Quer parecer sênior no papel (sem mentir)",

    // Pricing
    "pricing.title": "Planos de Assinatura",
    "pricing.subtitle": "Escolha o plano ideal para suas necessidades e tenha análises completas com relatório PDF detalhado todo mês.",
    "pricing.subscribe": "Assinar Agora",
    "pricing.loading": "Aguarde...",
    "pricing.popular": "Mais Popular",
    "pricing.perMonth": "/mês",
    "pricing.cancel": "Cancele a qualquer momento • Pagamento seguro via Stripe",
    "pricing.basic.name": "CVX Básico",
    "pricing.basic.analyses": "1 análise/mês",
    "pricing.basic.feature1": "1 análise completa por mês",
    "pricing.basic.feature2": "Relatório PDF detalhado",
    "pricing.basic.feature3": "Pontos fortes e fracos",
    "pricing.basic.feature4": "Palavras-chave faltantes",
    "pricing.basic.feature5": "Sugestões de melhoria",
    "pricing.intermediate.name": "CVX Intermediário",
    "pricing.intermediate.analyses": "10 análises/mês",
    "pricing.intermediate.feature1": "10 análises completas por mês",
    "pricing.intermediate.feature2": "4 currículos reescritos por mês",
    "pricing.intermediate.feature3": "Relatório PDF detalhado",
    "pricing.intermediate.feature4": "Pontos fortes e fracos",
    "pricing.intermediate.feature5": "Palavras-chave faltantes",
    "pricing.intermediate.feature6": "Sugestões de melhoria",
    "pricing.intermediate.highlight": "🎓 Mentoria por R$ 299/ano (valor promocional)",
    "pricing.advanced.name": "CVX Avançado",
    "pricing.advanced.analyses": "Ilimitado",
    "pricing.advanced.feature1": "Análises ilimitadas",
    "pricing.advanced.feature2": "Currículos reescritos ilimitados",
    "pricing.advanced.feature3": "Relatório PDF detalhado",
    "pricing.advanced.feature4": "Pontos fortes e fracos",
    "pricing.advanced.feature5": "Palavras-chave faltantes",
    "pricing.advanced.feature6": "Sugestões de melhoria",
    "pricing.advanced.feature7": "Acesso antecipado a novidades",
    "pricing.advanced.highlight": "🎓 Mentoria por R$ 199/ano (valor especial)",

    // FAQ
    "faq.title": "Perguntas Frequentes",
    "faq.q1": "Isso inventa experiências?",
    "faq.a1": "Não. O CVX melhora forma e impacto sem criar dados falsos.",
    "faq.q2": "Posso colar uma vaga?",
    "faq.a2": "Sim — e isso aumenta muito a qualidade do resultado.",
    "faq.q3": "Funciona em português e inglês?",
    "faq.a3": "Sim.",
    "faq.q4": "Recebo em quanto tempo?",
    "faq.a4": "Em minutos.",

    // Mentorship
    "mentorship.badge": "Mentoria Exclusiva",
    "mentorship.title": "Mentoria com Especialista em Carreira",
    "mentorship.subtitle": "Acelere sua transição de carreira com orientação personalizada de uma especialista.",
    "mentorship.name": "Marcela Absi",
    "mentorship.role": "Psicóloga & Mentora de Carreira",
    "mentorship.duration": "1 hora",
    "mentorship.format": "Online",
    "mentorship.about": "Sobre Marcela Absi",
    "mentorship.bio1": "Sou psicóloga com mais de 10 anos de experiência em gestão de pessoas e desenvolvimento profissional.",
    "mentorship.bio2": "Tenho vivência também como empreendedora no varejo, o que me proporcionou uma visão prática do mercado.",
    "mentorship.bio3": "Eu passei por isso. Sei o que é sentir que perdeu sua identidade profissional depois da maternidade. Sei o que é ter medo de recomeçar. E sei também que é possível se reencontrar.",
    "mentorship.bio4": "Hoje utilizo esse conhecimento e vivência para orientar profissionais na construção de carreiras mais alinhadas com seus propósitos e objetivos.",
    "mentorship.sessionType": "Mentoria Individual",
    "mentorship.promo": "🚀 Promoção de Lançamento - Por tempo limitado!",
    "mentorship.sessionDetails1": "Sessão de 1 hora",
    "mentorship.sessionDetails2": "Via videochamada",
    "mentorship.cta": "Agendar Mentoria",
    "mentorship.loading": "Aguarde...",

    // Resume Flow
    "flow.step1": "Importe seu Currículo",
    "flow.requiredResume": "Currículo obrigatório",
    "flow.requiredResumeDesc": "Envie um arquivo PDF/DOCX ou conecte seu LinkedIn.",
    "flow.importError": "Erro ao importar",
    "flow.notEnoughText": "Não foi possível extrair texto suficiente do currículo.",
    "flow.importButton": "Importar Currículo",
    "flow.imported": "Currículo Importado!",
    "flow.whatToDo": "O que você gostaria de fazer?",
    "flow.compareTitle": "Comparar com uma Vaga",
    "flow.compareDesc": "Analise seu fit com uma vaga específica e receba score de compatibilidade",
    "flow.rewriteTitle": "Reescrever Currículo",
    "flow.rewriteDesc": "Otimize seu currículo para ATS e recrutadores com nossa IA",
    "flow.premium": "Premium",
    "flow.back": "← Voltar",
    "flow.step2": "Descrição da Vaga",
    "flow.jobPlaceholder": "Cole aqui a descrição completa da vaga (requisitos, responsabilidades, qualificações...)",
    "flow.jobHint": "Copie e cole a descrição completa da vaga para uma análise mais precisa",
    "flow.jobRequired": "Descrição da vaga obrigatória",
    "flow.jobRequiredDesc": "Cole a descrição completa da vaga (mínimo 50 caracteres).",
    "flow.analyze": "Analisar Compatibilidade",
    "flow.improvements": "3 Pontos Principais de Melhoria",
    "flow.optimizedVersion": "Versão Otimizada Completa",
    "flow.optimizedDesc": "Receba seu currículo reescrito com todas as melhorias aplicadas, pronto para usar.",
    "flow.downloadPdf": "Baixar em PDF",
    "flow.pdfDesc": "Pronto para enviar",
    "flow.downloadWord": "Baixar em Word",
    "flow.wordDesc": "Editável + PDF incluso",
    "flow.redirecting": "Redirecionando para pagamento...",
    "flow.startOver": "← Começar novamente",
    "flow.checkoutError": "Erro no checkout",
    "flow.analysisError": "Erro na análise",

    // Coupon
    "coupon.placeholder": "Digite o código do cupom",
    "coupon.apply": "Aplicar",
    "coupon.add": "Adicionar cupom de desconto",
    "coupon.remove": "Remover cupom",

    // Checkout
    "checkout.error": "Erro ao criar sessão de pagamento",
    "checkout.retryError": "Não foi possível iniciar o checkout. Tente novamente.",
    "checkout.loginRequired": "Login necessário para continuar",
    "checkout.invalidProduct": "Produto inválido",
    "checkout.errorTitle": "Erro",

    // Auth Page
    "authPage.welcomeBack": "Bem-vindo de volta!",
    "authPage.createAccount": "Crie sua conta",
    "authPage.resetPassword": "Recuperar senha",
    "authPage.loginSubtitle": "Entre para acessar seu histórico",
    "authPage.signupSubtitle": "Salve suas análises na nuvem",
    "authPage.resetSubtitle": "Enviaremos um link para redefinir sua senha",
    "authPage.backToLogin": "Voltar ao login",
    "authPage.name": "Nome",
    "authPage.namePlaceholder": "Seu nome",
    "authPage.password": "Senha",
    "authPage.forgotPassword": "Esqueci minha senha",
    "authPage.loggingIn": "Entrando...",
    "authPage.creatingAccount": "Criando conta...",
    "authPage.sending": "Enviando...",
    "authPage.sendResetLink": "Enviar link de recuperação",
    "authPage.or": "ou",
    "authPage.googleSignIn": "Entrar com Google",
    "authPage.connecting": "Conectando...",
    "authPage.noAccount": "Não tem conta? Criar agora",
    "authPage.haveAccount": "Já tem conta? Entrar",
    "authPage.invalidData": "Dados inválidos",
    "authPage.invalidEmail": "Email inválido",
    "authPage.passwordMin": "Senha deve ter pelo menos 6 caracteres",
    "authPage.nameMin": "Nome deve ter pelo menos 2 caracteres",
    "authPage.loginError": "Erro ao entrar",
    "authPage.invalidCredentials": "Email ou senha incorretos",
    "authPage.signupError": "Erro ao criar conta",
    "authPage.emailRegistered": "Este email já está cadastrado",
    "authPage.accountCreated": "Conta criada!",
    "authPage.startUsing": "Você já pode começar a usar.",
    "authPage.emailError": "Erro ao enviar email",
    "authPage.emailSent": "Email enviado!",
    "authPage.checkInbox": "Verifique sua caixa de entrada para redefinir sua senha.",
    "authPage.googleError": "Erro ao entrar com Google",
    "authPage.unexpectedError": "Erro inesperado",
    "authPage.googleConnectError": "Não foi possível conectar com o Google.",
    "authPage.validEmail": "Por favor, insira um email válido.",

    // Members Page
    "members.title": "Área do Membro",
    "members.subtitle": "Gerencie sua conta e visualize seu histórico de análises",
    "members.logout": "Sair",
    "members.newAnalysis": "Nova Análise",
    "members.newAnalysisDesc": "Preencha os dados para gerar sua análise",
    "members.historyTab": "Histórico",
    "members.accountTab": "Minha Conta",
    "members.sortBy": "Ordenar por:",
    "members.date": "Data",
    "members.matchScore": "Nota do Match",
    "members.descending": "Decrescente",
    "members.ascending": "Crescente",
    "members.noAnalysis": "Nenhuma análise encontrada",
    "members.noAnalysisDesc": "Você ainda não realizou nenhuma análise de currículo.",
    "members.firstAnalysis": "Fazer Primeira Análise",
    "members.personalInfo": "Informações Pessoais",
    "members.manageProfile": "Gerencie seus dados de perfil",
    "members.fullName": "Nome Completo",
    "members.fullNamePlaceholder": "Seu nome completo",
    "members.birthDate": "Data de Nascimento",
    "members.phone": "Telefone",
    "members.phonePlaceholder": "(11) 99999-9999",
    "members.linkedinUrl": "URL do LinkedIn",
    "members.linkedinPlaceholder": "https://linkedin.com/in/seu-perfil",
    "members.saveChanges": "Salvar Alterações",
    "members.manageSubscription": "Gerenciar Assinatura",
    "members.cancelRequest": "Solicite o cancelamento da sua assinatura",
    "members.cancelInfo": "Para cancelar sua assinatura, envie um email para nossa equipe de suporte. Processaremos sua solicitação em até 48 horas úteis.",
    "members.requestCancel": "Solicitar Cancelamento",
    "members.profileUpdated": "Perfil atualizado",
    "members.profileSaved": "Suas informações foram salvas com sucesso.",
    "members.saveError": "Erro ao salvar",
    "members.saveErrorDesc": "Não foi possível salvar suas informações.",
    
    // Contact
    "contact.title": "Dúvidas ou sugestões?",
    "contact.cta": "Fale Conosco",
  },
  en: {
    // Header & Auth
    "auth.login": "Log In",
    "auth.signup": "Sign Up",
    "auth.logout": "Log Out",
    "auth.myAccount": "My Account",
    "auth.syncedHistory": "Synced History",
    "auth.user": "User",
    "auth.loginRequired": "Login required",
    "auth.loginRequiredDesc": "Log in or create an account to subscribe to a plan.",

    // Hero
    "hero.badge": "Powered by AI",
    "hero.title": "Your resume rewritten to",
    "hero.titleHighlight": "pass ATS",
    "hero.titleEnd": "and get interviews.",
    "hero.subtitle": "Upload your CV and get in minutes a diagnosis + optimized version with impactful bullets and the right keywords for the job.",
    "hero.proof1": "No fluff. No generic template.",
    "hero.proof2": "Result ready to copy and paste.",

    // Proof Points
    "proof.title": "CVX delivers what recruiters actually filter:",
    "proof.ats": "ATS score and critical issues",
    "proof.keywords": "Missing keywords by job / field",
    "proof.rewrite": "Professional rewrite (without making up data)",

    // How It Works
    "how.title": "How it works",
    "how.step1.title": "Upload your resume",
    "how.step1.desc": "PDF or text. If you want, also paste the Job Description.",
    "how.step2.title": "Get the diagnosis",
    "how.step2.desc": "Where you're losing points in ATS and human review.",
    "how.step3.title": "Unlock the rewritten CV (Pro)",
    "how.step3.desc": "Final version + strong bullets + structure ready for Word/LinkedIn.",

    // Pro Features
    "pro.title": "What you get",
    "pro.subtitle": "In the Pro plan",
    "pro.feature1": "Resume rewritten with impact",
    "pro.feature2": "LinkedIn-ready summary",
    "pro.feature3": "Results-oriented bullets",
    "pro.feature4": "Recommended skills and keywords",
    "pro.feature5": "Checklist of what to adjust (to boost your score)",

    // Target Audience
    "target.title": "Who it's for",
    "target.subtitle": "Perfect for those who:",
    "target.item1": "Are applying for jobs and not getting responses",
    "target.item2": "Want to switch fields and need to reposition their CV",
    "target.item3": "Need to tailor CV for a specific job",
    "target.item4": "Want to look senior on paper (without lying)",

    // Pricing
    "pricing.title": "Subscription Plans",
    "pricing.subtitle": "Choose the ideal plan for your needs and get complete analyses with detailed PDF report every month.",
    "pricing.subscribe": "Subscribe Now",
    "pricing.loading": "Please wait...",
    "pricing.popular": "Most Popular",
    "pricing.perMonth": "/month",
    "pricing.cancel": "Cancel anytime • Secure payment via Stripe",
    "pricing.basic.name": "CVX Basic",
    "pricing.basic.analyses": "1 analysis/month",
    "pricing.basic.feature1": "1 complete analysis per month",
    "pricing.basic.feature2": "Detailed PDF report",
    "pricing.basic.feature3": "Strengths and weaknesses",
    "pricing.basic.feature4": "Missing keywords",
    "pricing.basic.feature5": "Improvement suggestions",
    "pricing.intermediate.name": "CVX Intermediate",
    "pricing.intermediate.analyses": "10 analyses/month",
    "pricing.intermediate.feature1": "10 complete analyses per month",
    "pricing.intermediate.feature2": "4 resumes rewritten per month",
    "pricing.intermediate.feature3": "Detailed PDF report",
    "pricing.intermediate.feature4": "Strengths and weaknesses",
    "pricing.intermediate.feature5": "Missing keywords",
    "pricing.intermediate.feature6": "Improvement suggestions",
    "pricing.intermediate.highlight": "🎓 Mentorship for $199/year (promotional value)",
    "pricing.advanced.name": "CVX Advanced",
    "pricing.advanced.analyses": "Unlimited",
    "pricing.advanced.feature1": "Unlimited analyses",
    "pricing.advanced.feature2": "Unlimited resume rewrites",
    "pricing.advanced.feature3": "Detailed PDF report",
    "pricing.advanced.feature4": "Strengths and weaknesses",
    "pricing.advanced.feature5": "Missing keywords",
    "pricing.advanced.feature6": "Improvement suggestions",
    "pricing.advanced.feature7": "Early access to new features",
    "pricing.advanced.highlight": "🎓 Mentorship for $149/year (special value)",

    // FAQ
    "faq.title": "Frequently Asked Questions",
    "faq.q1": "Does it make up experiences?",
    "faq.a1": "No. CVX improves form and impact without creating false data.",
    "faq.q2": "Can I paste a job posting?",
    "faq.a2": "Yes — and it greatly increases the quality of the result.",
    "faq.q3": "Does it work in Portuguese and English?",
    "faq.a3": "Yes.",
    "faq.q4": "How long does it take?",
    "faq.a4": "Minutes.",

    // Mentorship
    "mentorship.badge": "Exclusive Mentorship",
    "mentorship.title": "Career Expert Mentorship",
    "mentorship.subtitle": "Accelerate your career transition with personalized guidance from a specialist.",
    "mentorship.name": "Marcela Absi",
    "mentorship.role": "Psychologist & Career Mentor",
    "mentorship.duration": "1 hour",
    "mentorship.format": "Online",
    "mentorship.about": "About Marcela Absi",
    "mentorship.bio1": "I'm a psychologist with over 10 years of experience in people management and professional development.",
    "mentorship.bio2": "I also have experience as a retail entrepreneur, which gave me a practical view of the market.",
    "mentorship.bio3": "I've been there. I know what it's like to feel you've lost your professional identity after motherhood. I know what it's like to be afraid to start over. And I also know it's possible to find yourself again.",
    "mentorship.bio4": "Today I use this knowledge and experience to guide professionals in building careers more aligned with their purposes and goals.",
    "mentorship.sessionType": "Individual Mentorship",
    "mentorship.promo": "🚀 Launch Promotion - Limited time!",
    "mentorship.sessionDetails1": "1-hour session",
    "mentorship.sessionDetails2": "Via video call",
    "mentorship.cta": "Schedule Mentorship",
    "mentorship.loading": "Please wait...",

    // Resume Flow
    "flow.step1": "Import Your Resume",
    "flow.requiredResume": "Resume required",
    "flow.requiredResumeDesc": "Upload a PDF/DOCX file or connect your LinkedIn.",
    "flow.importError": "Import error",
    "flow.notEnoughText": "Could not extract enough text from the resume.",
    "flow.importButton": "Import Resume",
    "flow.imported": "Resume Imported!",
    "flow.whatToDo": "What would you like to do?",
    "flow.compareTitle": "Compare with a Job",
    "flow.compareDesc": "Analyze your fit with a specific job and get a compatibility score",
    "flow.rewriteTitle": "Rewrite Resume",
    "flow.rewriteDesc": "Optimize your resume for ATS and recruiters with our AI",
    "flow.premium": "Premium",
    "flow.back": "← Back",
    "flow.step2": "Job Description",
    "flow.jobPlaceholder": "Paste here the complete job description (requirements, responsibilities, qualifications...)",
    "flow.jobHint": "Copy and paste the complete job description for a more accurate analysis",
    "flow.jobRequired": "Job description required",
    "flow.jobRequiredDesc": "Paste the complete job description (minimum 50 characters).",
    "flow.analyze": "Analyze Compatibility",
    "flow.improvements": "3 Main Improvement Points",
    "flow.optimizedVersion": "Complete Optimized Version",
    "flow.optimizedDesc": "Get your resume rewritten with all improvements applied, ready to use.",
    "flow.downloadPdf": "Download as PDF",
    "flow.pdfDesc": "Ready to send",
    "flow.downloadWord": "Download as Word",
    "flow.wordDesc": "Editable + PDF included",
    "flow.redirecting": "Redirecting to payment...",
    "flow.startOver": "← Start over",
    "flow.checkoutError": "Checkout error",
    "flow.analysisError": "Analysis error",

    // Coupon
    "coupon.placeholder": "Enter coupon code",
    "coupon.apply": "Apply",
    "coupon.add": "Add discount coupon",
    "coupon.remove": "Remove coupon",

    // Checkout
    "checkout.error": "Error creating payment session",
    "checkout.retryError": "Could not start checkout. Please try again.",
    "checkout.loginRequired": "Login required to continue",
    "checkout.invalidProduct": "Invalid product",
    "checkout.errorTitle": "Error",

    // Contact
    "contact.title": "Questions or suggestions?",
    "contact.cta": "Contact Us",

    // Auth Page
    "authPage.welcomeBack": "Welcome back!",
    "authPage.createAccount": "Create your account",
    "authPage.resetPassword": "Reset password",
    "authPage.loginSubtitle": "Log in to access your history",
    "authPage.signupSubtitle": "Save your analyses in the cloud",
    "authPage.resetSubtitle": "We'll send you a link to reset your password",
    "authPage.backToLogin": "Back to login",
    "authPage.name": "Name",
    "authPage.namePlaceholder": "Your name",
    "authPage.password": "Password",
    "authPage.forgotPassword": "Forgot my password",
    "authPage.loggingIn": "Logging in...",
    "authPage.creatingAccount": "Creating account...",
    "authPage.sending": "Sending...",
    "authPage.sendResetLink": "Send reset link",
    "authPage.or": "or",
    "authPage.googleSignIn": "Sign in with Google",
    "authPage.connecting": "Connecting...",
    "authPage.noAccount": "Don't have an account? Create one",
    "authPage.haveAccount": "Already have an account? Log in",
    "authPage.invalidData": "Invalid data",
    "authPage.invalidEmail": "Invalid email",
    "authPage.passwordMin": "Password must be at least 6 characters",
    "authPage.nameMin": "Name must be at least 2 characters",
    "authPage.loginError": "Error logging in",
    "authPage.invalidCredentials": "Incorrect email or password",
    "authPage.signupError": "Error creating account",
    "authPage.emailRegistered": "This email is already registered",
    "authPage.accountCreated": "Account created!",
    "authPage.startUsing": "You can start using now.",
    "authPage.emailError": "Error sending email",
    "authPage.emailSent": "Email sent!",
    "authPage.checkInbox": "Check your inbox to reset your password.",
    "authPage.googleError": "Error signing in with Google",
    "authPage.unexpectedError": "Unexpected error",
    "authPage.googleConnectError": "Could not connect to Google.",
    "authPage.validEmail": "Please enter a valid email.",

    // Members Page
    "members.title": "Member Area",
    "members.subtitle": "Manage your account and view your analysis history",
    "members.logout": "Log out",
    "members.newAnalysis": "New Analysis",
    "members.newAnalysisDesc": "Fill in the data to generate your analysis",
    "members.historyTab": "History",
    "members.accountTab": "My Account",
    "members.sortBy": "Sort by:",
    "members.date": "Date",
    "members.matchScore": "Match Score",
    "members.descending": "Descending",
    "members.ascending": "Ascending",
    "members.noAnalysis": "No analysis found",
    "members.noAnalysisDesc": "You haven't done any resume analysis yet.",
    "members.firstAnalysis": "Do First Analysis",
    "members.personalInfo": "Personal Information",
    "members.manageProfile": "Manage your profile data",
    "members.fullName": "Full Name",
    "members.fullNamePlaceholder": "Your full name",
    "members.birthDate": "Birth Date",
    "members.phone": "Phone",
    "members.phonePlaceholder": "(11) 99999-9999",
    "members.linkedinUrl": "LinkedIn URL",
    "members.linkedinPlaceholder": "https://linkedin.com/in/your-profile",
    "members.saveChanges": "Save Changes",
    "members.manageSubscription": "Manage Subscription",
    "members.cancelRequest": "Request cancellation of your subscription",
    "members.cancelInfo": "To cancel your subscription, send an email to our support team. We will process your request within 48 business hours.",
    "members.requestCancel": "Request Cancellation",
    "members.profileUpdated": "Profile updated",
    "members.profileSaved": "Your information has been saved successfully.",
    "members.saveError": "Error saving",
    "members.saveErrorDesc": "Could not save your information.",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("cvx-language");
    return (saved as Language) || "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("cvx-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
