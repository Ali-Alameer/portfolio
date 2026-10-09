// Content sourced from the University of Salford staff profile, Google Scholar
// (snapshot 1 Oct 2026) and github.com/Ali-Alameer. Update figures here.

export const profile = {
  name: "Ali Alameer",
  honorific: "Dr",
  role: "Lecturer in Artificial Intelligence",
  school: "School of Science, Engineering & Environment",
  university: "University of Salford",
  phd: "PhD in AI, Newcastle University",
  senate: "Elected member of the University Senate",
  email: "A.Alameer1@salford.ac.uk",
  summary:
    "I build multimodal machine learning methods that integrate high-dimensional visual, temporal and textual data, and put them to work in places that are hard on models: livestock barns, courtrooms, insurance claims and building surveys.",
  links: {
    scholar: "https://scholar.google.com/citations?user=tiQjPacAAAAJ&hl=en",
    github: "https://github.com/Ali-Alameer",
    salford: "https://www.salford.ac.uk/our-staff/ali-alameer",
    repository: "https://salford-repository.worktribe.com/person/1178234/ali-alameer",
  },
};

export const scholarStats = {
  asOf: "Oct 2026",
  lastUpdated: "9 October 2026",
  citations: { all: 1308, since2021: 1135 },
  hIndex: { all: 15, since2021: 12 },
  i10: { all: 24, since2021: 18 },
  // Citations received per calendar year (2026 is partial).
  perYear: [
    { year: 2016, count: 4 },
    { year: 2017, count: 17 },
    { year: 2018, count: 29 },
    { year: 2019, count: 37 },
    { year: 2020, count: 74 },
    { year: 2021, count: 65 },
    { year: 2022, count: 103 },
    { year: 2023, count: 105 },
    { year: 2024, count: 144 },
    { year: 2025, count: 386 },
    { year: 2026, count: 315 },
  ],
};

export type ThemeId = "livestock" | "language" | "fairness" | "vision";

export const themes: {
  id: ThemeId;
  label: string;
  title: string;
  body: string;
  // A detection-style tag shown on the theme card, written like a model output.
  tag: string;
}[] = [
  {
    id: "livestock",
    label: "Precision livestock",
    title: "Machine vision for animal welfare",
    body: "Deep learning and vision transformers that recognise posture, feeding, drinking and social contact in pigs and dairy cows from ordinary pen cameras, so that compromised health shows up in the data before it shows up in the animal.",
    tag: "pig · drinking  0.94",
  },
  {
    id: "language",
    label: "Vision + language",
    title: "Multimodal AI for industry",
    body: "Vision-language and speech models built with industrial partners through Knowledge Transfer Partnerships: digital building surveys, motor insurance claims, document query management and court transcription.",
    tag: "survey · damp_mould  0.88",
  },
  {
    id: "fairness",
    label: "Responsible AI",
    title: "Fairness, bias and governance",
    body: "Methods for detecting and mitigating algorithmic bias, with a focus on recruitment, speech recognition in legal settings and inclusive prompt engineering for large language models.",
    tag: "audit · bias_flag  0.71",
  },
  {
    id: "vision",
    label: "Foundations",
    title: "Biologically inspired vision",
    body: "My PhD work at Newcastle: hierarchical models of the visual cortex (EN-HMAX), context-based object recognition, and early deep learning for grasp classification in prosthetic hands.",
    tag: "v1 · s1_c1_pool  0.82",
  },
];

export type Publication = {
  title: string;
  authors: string;
  venue: string;
  year: number;
  citations: number;
  theme: ThemeId;
  featured?: boolean;
  doi?: string; // from Crossref; titles link to the paper when set
};

export const publications: Publication[] = [
  { title: "HADQEF: a hybrid AI framework for enhancing Arabic data quality and governance in alignment with Saudi Vision 2030", authors: "E Albaroudi, M Hatamleh, T Mansouri, A Alameer", venue: "Discover Artificial Intelligence", year: 2026, citations: 0, doi: "10.1007/s44163-026-01625-1", theme: "fairness" },
  { title: "Understanding contest skill to reduce the welfare costs of aggression", authors: "LS Oldham, GA Arnott, M Briffa, A Futro, J Donbavand, AK Kadlecova, et al.", venue: "Biology Letters 22(4)", year: 2026, citations: 0, doi: "10.1098/rsbl.2025.0563", theme: "livestock" },
  { title: "Addressing intersectional bias in AI recruitment using HITHIRE model: a fair, ethical, green AI and transparent hiring solution for Saudi Arabia's diverse workforce", authors: "E Albaroudi, T Mansouri, M Hatamleh, A Alameer", venue: "AI and Ethics 6(1)", year: 2026, citations: 5, doi: "10.1007/s43681-025-00844-z", theme: "fairness" },
  { title: "COLLAB-LLM: a communication-centric role-based framework for scalable multi-agent LLM collaboration", authors: "E Albaroudi, M Hatamleh, MS Hejazi, AY Alshalabi, T Mansouri, et al.", venue: "Asian Journal of Research in Computer Science 19(1)", year: 2026, citations: 2, doi: "10.9734/ajrcos/2026/v19i1811", theme: "language" },
  { title: "Vision transformer-based multi-camera multi-object tracking framework for dairy cow monitoring", authors: "K Abbas, Z Afzal, A Raza, T Mansouri, AW Dowsey, C Inchaisri, et al.", venue: "Smart Agricultural Technology", year: 2025, citations: 8, doi: "10.1016/j.atech.2025.101525", theme: "livestock", featured: true },
  { title: "HitHire: the future of ethical, fair, and sustainable AI recruitment. A governance framework", authors: "E Albaroudi, T Mansouri, M Hatamleh, A Alameer", venue: "Array", year: 2025, citations: 9, doi: "10.1016/j.array.2025.100592", theme: "fairness" },
  { title: "Inclusive prompt engineering for large language models: a modular framework for ethical, structured, and adaptive AI", authors: "MS Torkestani, A Alameer, S Palaiahnakote, T Mansouri", venue: "Artificial Intelligence Review 58(11)", year: 2025, citations: 12, doi: "10.1007/s10462-025-11330-7", theme: "fairness", featured: true },
  { title: "A comparative analysis of state-of-the-art speech-to-text models for court applications", authors: "A Alameer, HK Jahromi, Z Afzal, M Malik, S Morphy, T Mansouri", venue: "Intl. Conference on Data Science, AI and Applications", year: 2025, citations: 1, doi: "10.1007/978-3-032-11355-9_32", theme: "language" },
  { title: "Vision transformers for automated detection of pig interactions in groups", authors: "G Taiwo, S Vadera, A Alameer", venue: "Smart Agricultural Technology 10", year: 2025, citations: 55, doi: "10.1016/j.atech.2025.100774", theme: "livestock", featured: true },
  { title: "A newly adopted YOLOv9 model for detecting mould regions inside of buildings", authors: "T Mansouri, MS Mashuk, S Palaiahnakote, A Chacko, L Sykes, A Alameer", venue: "Intl. Journal of Pattern Recognition and Artificial Intelligence 39", year: 2025, citations: 3, doi: "10.1142/s0218001424500253", theme: "language" },
  { title: "Generative AI and the future of software engineering in Saudi Arabia: governance, innovation, and workforce transformation", authors: "E Albaroudi, T Mansouri, M Hatamleh, M Elbehairy, A Alameer", venue: "Intl. Journal of Theoretical & Applied Computational Intelligence", year: 2025, citations: 16, doi: "10.65278/ijtaci.2025.4", theme: "fairness" },
  { title: "Saudi Arabia's Vision 2030: leveraging generative artificial intelligence to enhance software engineering", authors: "E Albaroudi, T Mansouri, M Hatamleh, A Alameer", venue: "8th Intl. Women in Data Science Conference, Prince Sultan University", year: 2025, citations: 15, doi: "10.1109/wids-psu64963.2025.00024", theme: "fairness" },
  { title: "RLS adaptive filter co-design for de-noising ECG signal", authors: "AF Mahmood, SN Awny, A Alameer", venue: "Results in Engineering 24", year: 2024, citations: 15, doi: "10.1016/j.rineng.2024.103563", theme: "vision" },
  { title: "Review of farmer-centered AI systems technologies in livestock operations", authors: "GA Taiwo, A Alameer, T Mansouri", venue: "CABI Reviews 19(1)", year: 2024, citations: 11, doi: "10.1079/cabireviews.2024.0038", theme: "livestock" },
  { title: "The intersection of generative AI and healthcare: addressing challenges to enhance patient care", authors: "E Albaroudi, T Mansouri, A Alameer", venue: "7th Intl. Women in Data Science Conference, Prince Sultan University", year: 2024, citations: 29, doi: "10.1109/wids-psu61003.2024.00039", theme: "fairness" },
  { title: "A comprehensive review of AI techniques for addressing algorithmic bias in job hiring", authors: "E Albaroudi, T Mansouri, A Alameer", venue: "AI 5(1), 383–404", year: 2024, citations: 283, doi: "10.3390/ai5010019", theme: "fairness", featured: true },
  { title: "Toward the automated detection of behavioral changes associated with the post-weaning transition in pigs", authors: "I Kyriazakis, A Alameer, K Bučková, R Muns", venue: "Frontiers in Veterinary Science 9", year: 2023, citations: 11, doi: "10.3389/fvets.2022.1087570", theme: "livestock" },
  { title: "Automated detection and quantification of contact behaviour in pigs using deep learning", authors: "A Alameer, S Buijs, N O'Connell, L Dalton, M Larsen, L Pedersen, et al.", venue: "Biosystems Engineering 224, 118–130", year: 2022, citations: 47, doi: "10.1016/j.biosystemseng.2022.10.002", theme: "livestock" },
  { title: "Labeled projective dictionary pair learning: application to handwritten numbers recognition", authors: "R Ameri, A Alameer, S Ferdowsi, K Nazarpour, V Abolghasemi", venue: "Information Sciences 609, 489–506", year: 2022, citations: 16, doi: "10.1016/j.ins.2022.07.070", theme: "vision" },
  { title: "Classification of handwritten Chinese numbers with convolutional neural networks", authors: "R Ameri, A Alameer, S Ferdowsi, V Abolghasemi, K Nazarpour", venue: "5th Intl. Conference on Pattern Recognition and Image Analysis", year: 2021, citations: 8, doi: "10.1109/ipria53572.2021.9483557", theme: "vision" },
  { title: "Automatic recognition of feeding and foraging behaviour in pigs using deep learning", authors: "A Alameer, I Kyriazakis, HA Dalton, AL Miller, J Bacardit", venue: "Biosystems Engineering 197, 91–104", year: 2020, citations: 145, doi: "10.1016/j.biosystemseng.2020.06.013", theme: "livestock", featured: true },
  { title: "Automated recognition of postures and drinking behaviour for the detection of compromised health in pigs", authors: "A Alameer, I Kyriazakis, J Bacardit", venue: "Scientific Reports 10(1)", year: 2020, citations: 149, doi: "10.1038/s41598-020-70688-6", theme: "livestock", featured: true },
  { title: "Objects and scenes classification with selective use of central and peripheral image content", authors: "A Alameer, P Degenaar, K Nazarpour", venue: "Journal of Visual Communication and Image Representation 66", year: 2020, citations: 10, doi: "10.1016/j.jvcir.2019.102698", theme: "vision" },
  { title: "Context-based object recognition: indoor versus outdoor environments", authors: "A Alameer, P Degenaar, K Nazarpour", venue: "Science and Information Conference", year: 2019, citations: 12, doi: "10.1007/978-3-030-17798-0_38", theme: "vision" },
  { title: "Incoherent dictionary pair learning: application to a novel open-source database of Chinese numbers", authors: "V Abolghasemi, M Chen, A Alameer, S Ferdowsi, J Chambers, et al.", venue: "IEEE Signal Processing Letters 25(4)", year: 2018, citations: 18, doi: "10.1109/lsp.2018.2798406", theme: "vision" },
  { title: "Biologically-inspired hierarchical architectures for object recognition", authors: "A Alameer", venue: "PhD thesis, Newcastle University", year: 2018, citations: 5, theme: "vision" },
  { title: "Deep learning-based artificial vision for grasp classification in myoelectric hands", authors: "G Ghazaei, A Alameer, P Degenaar, G Morgan, K Nazarpour", venue: "Journal of Neural Engineering 14(3)", year: 2017, citations: 237, doi: "10.1088/1741-2552/aa6802", theme: "vision", featured: true },
  { title: "Processing occlusions using elastic-net hierarchical max model of the visual cortex", authors: "A Alameer, P Degenaar, K Nazarpour", venue: "IEEE INISTA", year: 2017, citations: 8, doi: "10.1109/inista.2017.8001150", theme: "vision" },
  { title: "Object recognition with an elastic net-regularized hierarchical MAX model of the visual cortex", authors: "A Alameer, G Ghazaei, P Degenaar, JA Chambers, K Nazarpour", venue: "IEEE Signal Processing Letters 23(8)", year: 2016, citations: 20, doi: "10.1109/lsp.2016.2582541", theme: "vision" },
  { title: "Biologically-inspired object recognition system for recognizing natural scene categories", authors: "A Alameer, P Degenaar, K Nazarpour", venue: "Intl. Conference for Students on Applied Engineering (ICSAE)", year: 2016, citations: 10, doi: "10.1109/icsae.2016.7810174", theme: "vision" },
  { title: "An exploratory study on the use of convolutional neural networks for object grasp classification", authors: "G Ghazaei, A Alameer, P Degenaar, G Morgan, K Nazarpour", venue: "Intelligent Signal Processing Conference", year: 2015, citations: 32, doi: "10.1049/cp.2015.1760", theme: "vision" },
  { title: "An elastic net-regularized HMAX model of visual processing", authors: "A Alameer, G Ghazaei, P Degenaar, K Nazarpour", venue: "Intelligent Signal Processing Conference", year: 2015, citations: 11, doi: "10.1049/cp.2015.1753", theme: "vision" },
];

export type Grant = {
  title: string;
  funder: string;
  partner?: string;
  amount: number; // GBP
  kind: "Grant" | "KTP" | "Consultancy";
  status: "Ongoing" | "Completed";
};

export const grants: Grant[] = [
  { title: "Vision-language model for digital surveying", funder: "Innovate UK", partner: "Corelain Ltd", amount: 287332, kind: "KTP", status: "Ongoing" },
  { title: "Computer vision and NLP for motor insurance", funder: "Innovate UK", partner: "Whichrate Ltd", amount: 298230, kind: "KTP", status: "Ongoing" },
  { title: "Vision and NLP for text and image query management", funder: "Innovate UK", partner: "TSK Group", amount: 293603, kind: "KTP", status: "Ongoing" },
  { title: "Sustainable dairy farming via machine vision", funder: "British Council / ISPF", amount: 79942, kind: "Grant", status: "Ongoing" },
  { title: "AI fairness, bias and digital sustainability", funder: "Research grant", amount: 135619, kind: "Grant", status: "Completed" },
  { title: "ELI: Expert Legal Intelligence", funder: "Research grant", partner: "Salford share", amount: 78514, kind: "Grant", status: "Completed" },
  { title: "Ethical AI auditing tool validation", funder: "Research grant", amount: 2500, kind: "Grant", status: "Completed" },
  { title: "ASR bias and fairness evaluation for legal deployment", funder: "Industry", amount: 37728, kind: "Consultancy", status: "Completed" },
  { title: "Personalised AI recommendation engine", funder: "World Privilege Ltd", amount: 19743, kind: "Consultancy", status: "Completed" },
  { title: "Applied AI safety training programme", funder: "Industry", amount: 16000, kind: "Consultancy", status: "Completed" },
];

export const modules = [
  {
    name: "Deep Learning",
    programme: "MSc Artificial Intelligence",
    repo: "Deep-Learning",
    stars: 36,
    blurb: "A course repository of notebooks covering the foundations of deep learning, written for MSc AI students.",
  },
  {
    name: "Natural Language Processing",
    programme: "MSc Artificial Intelligence",
    repo: "NLP",
    stars: 31,
    blurb: "NLP tutorials and resources in Keras and TensorFlow, from tokenisation to transformer models.",
  },
];

export const repos = [
  { name: "AI_fairness", stars: 15, blurb: "Libraries, tools and tutorials for identifying and mitigating bias in machine learning models." },
  { name: "Machine-Vision", stars: 11, blurb: "Object detection, image classification and transfer learning in TensorFlow and PyTorch." },
  { name: "RAICo-AI-Summit---Basics-of-AI", stars: 0, blurb: "Materials from the RAICo AI Summit session on the basics of AI." },
];

export const supervision = {
  current: [
    { name: "Yakup Keskindag", degree: "PhD", topic: "Privacy-preserving small language models" },
    { name: "Rashid Yaghi", degree: "PhD", topic: "AI governance" },
    { name: "Gbadegesin Taiwo", degree: "PhD", topic: "Machine vision for pig behaviour detection" },
    { name: "Ali Jamali", degree: "MPhil", topic: "AI-based recommendation systems" },
    { name: "Maryam Vadikheil", degree: "MPhil", topic: "Transformer-based deepfake detection" },
  ],
  completed: [
    { name: "Elham Albaroudi", degree: "PhD", topic: "AI fairness in job hiring" },
    { name: "Kumail Abbas", degree: "PhD", topic: "Machine vision for cow behaviour detection, with Chulalongkorn University and the University of Bristol" },
  ],
  ktpAssociates: [
    { name: "Zeeshan Afzal", topic: "Vision-language model digital surveying tool" },
    { name: "Mohamed Maharoof", topic: "LLM and vision models for indexing and cross-referencing" },
    { name: "AJ Shoaib", topic: "Computer vision and NLP for motor insurance" },
  ],
};
