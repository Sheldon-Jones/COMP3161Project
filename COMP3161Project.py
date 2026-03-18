"""
generate_sql.py
───────────────
Generates  data.sql  containing all INSERT statements for COMP3161_Final_Proj.

Requirements:
    pip install faker

Usage:
    python generate_sql.py
    # Produces: data.sql  (import with: mysql -u root -p COMP3161_Final_Proj < data.sql)

Constraints enforced:
    a. >= 100,000 students
    b. >= 200 courses
    c. No student enrolled in more than 6 courses
    d. Every student enrolled in at least 3 courses
    e. Every course has at least 10 enrolled students
    f. No lecturer assigned to more than 5 courses
    g. Every lecturer assigned to at least 1 course
"""

import random
import re
import hashlib
from datetime import date, timedelta, datetime
from faker import Faker

# ── CONFIGURATION ─────────────────────────────────────────────────────────────
OUTPUT_FILE   = "data.sql"
NUM_ADMINS    = 5
# With 200 courses and each lecturer teaching 1-5 courses:
# min lecturers = ceil(200/5) = 40  (all teach the maximum of 5)
# max lecturers = 200               (all teach just 1 course)
# 80 lecturers gives an average load of 2-3 courses each, which is realistic.
NUM_LECTURERS = 80
NUM_STUDENTS  = 100_000
ROWS_PER_INSERT = 500      # rows per INSERT statement (keeps statements manageable)

fake = Faker()
Faker.seed(42)
random.seed(42)

UNIVERSITY_DOMAINS = [
    "uwimail.edu.jm", "sta.uwi.edu", "mona.uwi.edu",
    "students.edu.jm", "campusemail.edu.jm",
]

# ── HELPERS ───────────────────────────────────────────────────────────────────

def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))

def hash_pw(raw: str) -> str:
    return hashlib.md5(raw.encode()).hexdigest()[:50]

_seen_emails: set = set()

def make_email(name: str) -> str:
    """Return a deterministic-looking email derived from the person's name."""
    parts = re.sub(r"[^a-z ]", "", name.lower()).split()
    if len(parts) >= 2:
        first, last = parts[0], parts[-1]
        candidates = [
            f"{first}.{last}",
            f"{first[0]}{last}",
            f"{first}{last[0]}",
            f"{last}.{first}",
            f"{first}_{last}",
        ]
    else:
        slug = parts[0] if parts else "user"
        candidates = [slug, slug + "s", slug + "x"]

    domain = random.choice(UNIVERSITY_DOMAINS)
    for base in candidates:
        for suffix in range(1, 1000):
            email = f"{base}{suffix}@{domain}"
            if email not in _seen_emails:
                _seen_emails.add(email)
                return email
    # absolute fallback
    fallback = f"user{len(_seen_emails)}@{domain}"
    _seen_emails.add(fallback)
    return fallback

def sql_str(v) -> str:
    """Escape and quote a Python value for a MySQL VALUES clause."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "1" if v else "0"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, (date, datetime)):
        return f"'{v}'"
    # string – escape backslash and single-quote
    escaped = str(v).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"

def write_inserts(fh, table: str, columns: list, rows: list):
    """Write batched multi-row INSERT statements to fh."""
    if not rows:
        return
    col_str = ", ".join(f"`{c}`" for c in columns)
    for i in range(0, len(rows), ROWS_PER_INSERT):
        batch = rows[i:i + ROWS_PER_INSERT]
        values_str = ",\n  ".join(
            "(" + ", ".join(sql_str(v) for v in row) + ")"
            for row in batch
        )
        fh.write(f"INSERT INTO `{table}` ({col_str}) VALUES\n  {values_str};\n")
    fh.write("\n")

# ── 200 COURSES ───────────────────────────────────────────────────────────────
# Tuple: (course_id, course_name, description)
COURSE_POOL = [
    # Computer Science (30)
    ("COMP1001", "Introduction to Computing",
     "A broad introduction to computing concepts, hardware, software, and the role of computers in society. Topics include binary representation, operating systems, the internet, and basic programming logic."),
    ("COMP1002", "Programming Fundamentals",
     "Covers the fundamentals of programming using Python. Students learn variables, control flow, functions, and file I/O while solving practical problems through hands-on coding exercises."),
    ("COMP1003", "Web Development Basics",
     "Introduction to building web pages using HTML5, CSS3, and basic JavaScript. Students create responsive, accessible websites and learn the client-server model and HTTP protocol."),
    ("COMP2001", "Data Structures and Algorithms",
     "A study of fundamental data structures—arrays, linked lists, stacks, queues, trees, and graphs—alongside classic algorithms for searching, sorting, and graph traversal with complexity analysis."),
    ("COMP2002", "Object-Oriented Programming",
     "Explores OOP principles including encapsulation, inheritance, polymorphism, and abstraction using Java. Design patterns and UML are introduced to model real-world systems."),
    ("COMP2003", "Database Systems",
     "Covers relational database theory, entity-relationship modelling, SQL, normalisation, and transaction management. Students design and query databases for realistic business scenarios."),
    ("COMP2004", "Computer Organization",
     "Examines how computers work at the hardware level: CPU architecture, instruction sets, memory hierarchy, I/O systems, and the relationship between assembly language and machine code."),
    ("COMP2005", "Operating Systems",
     "Topics include process management, CPU scheduling, memory management, file systems, and concurrency. Students implement threads and synchronisation primitives in C."),
    ("COMP2006", "Computer Networks",
     "Covers the OSI and TCP/IP models, data link protocols, IP addressing, routing, transport-layer services, and application-layer protocols such as HTTP, DNS, and SMTP."),
    ("COMP2007", "Software Engineering",
     "Introduces the software development lifecycle, requirements engineering, agile methods, version control, testing strategies, and software quality assurance through team projects."),
    ("COMP3001", "Advanced Algorithms",
     "In-depth treatment of algorithm design paradigms: divide and conquer, dynamic programming, greedy algorithms, and network flow. NP-completeness and approximation algorithms are also covered."),
    ("COMP3002", "Compiler Design",
     "Studies the phases of compilation: lexical analysis, parsing, semantic analysis, intermediate code generation, optimisation, and code generation. Students build a working compiler in stages."),
    ("COMP3003", "Distributed Systems",
     "Principles of designing systems that span multiple machines: remote procedure calls, consistency models, distributed file systems, replication, fault tolerance, and consensus protocols."),
    ("COMP3004", "Human-Computer Interaction",
     "Focuses on user-centred design, usability principles, prototyping, and evaluation techniques. Students conduct usability studies and redesign existing interfaces based on findings."),
    ("COMP3005", "Mobile Application Development",
     "Hands-on development of Android and iOS applications. Topics include mobile UI design, sensors, background processing, local storage, and consuming RESTful web services."),
    ("COMP3006", "Cloud Computing",
     "Explores cloud service models (IaaS, PaaS, SaaS), virtualisation, containerisation with Docker, orchestration with Kubernetes, and deployment on AWS and GCP."),
    ("COMP3007", "Parallel Computing",
     "Covers parallel algorithm design, shared-memory programming with OpenMP, distributed-memory programming with MPI, GPU programming, and performance benchmarking."),
    ("COMP3161", "Advanced Database Systems",
     "Extends foundational knowledge to query optimisation, advanced indexing structures, NoSQL databases, distributed data management, data replication, and modern NewSQL systems."),
    ("COMP3009", "Computer Graphics",
     "Principles of 2D and 3D rendering: transformations, rasterisation, ray tracing, shading models, texture mapping, and real-time graphics using OpenGL and GLSL shaders."),
    ("COMP3010", "Embedded Systems",
     "Programming microcontrollers for real-time applications. Topics include interrupt handling, timers, serial communication, PWM, and sensor interfacing on ARM Cortex-M devices."),
    ("COMP4001", "Artificial Intelligence",
     "Covers search algorithms, constraint satisfaction, knowledge representation, logic, Bayesian networks, and planning. Students implement intelligent agents in a series of projects."),
    ("COMP4002", "Machine Learning",
     "Supervised and unsupervised learning algorithms including linear regression, decision trees, SVMs, k-means, and PCA. Model evaluation, cross-validation, and feature engineering are emphasised."),
    ("COMP4003", "Deep Learning",
     "Focuses on neural network architectures: feedforward networks, CNNs, RNNs, attention mechanisms, and transformers. Students train models using PyTorch on image and text datasets."),
    ("COMP4004", "Computer Vision",
     "Image processing fundamentals, feature detection, object recognition, semantic segmentation, and generative models. Projects involve building vision pipelines for real-world applications."),
    ("COMP4005", "Natural Language Processing",
     "Covers tokenisation, language modelling, sequence labelling, machine translation, sentiment analysis, and large language models. Students fine-tune pre-trained models on domain-specific tasks."),
    ("COMP4006", "Cybersecurity Principles",
     "Principles of information security: cryptographic protocols, authentication, network attacks and defences, secure coding, web application security, and security auditing."),
    ("COMP4007", "Blockchain Technology",
     "Covers distributed ledger concepts, consensus mechanisms, smart contract development in Solidity, decentralised applications, and the economic and regulatory landscape of blockchain."),
    ("COMP4008", "Internet of Things",
     "Architecture and protocols for IoT ecosystems: MQTT, CoAP, edge computing, sensor networks, power constraints, and building end-to-end IoT pipelines with cloud integration."),
    ("COMP4009", "Big Data Analytics",
     "Processing large-scale datasets using Hadoop MapReduce and Apache Spark. Topics include distributed storage, batch and stream processing, and scalable data pipeline design."),
    ("COMP4010", "Quantum Computing",
     "Fundamentals of quantum mechanics applied to computing: qubits, quantum gates, Grover's algorithm, Shor's algorithm, and implications for cryptography and optimisation."),

    # Mathematics (20)
    ("MATH1001", "Calculus I",
     "Introduces limits, continuity, differentiation, and the fundamental theorem of calculus. Applications include optimisation, related rates, and area under a curve."),
    ("MATH1002", "Calculus II",
     "Covers techniques of integration, sequences and series, Taylor polynomials, and introductory differential equations. Applications to physics and engineering are highlighted."),
    ("MATH1003", "Foundation Statistics",
     "An entry-level course covering descriptive statistics, probability, sampling distributions, hypothesis testing, and simple linear regression for students with no prior statistics background."),
    ("MATH2001", "Linear Algebra",
     "Vector spaces, matrix operations, determinants, eigenvalues, and eigenvectors. Applications include PCA, systems of linear equations, and linear transformations."),
    ("MATH2002", "Discrete Mathematics",
     "Logic, set theory, proof techniques, combinatorics, graph theory, and relations. Emphasis on mathematical reasoning relevant to computer science and cryptography."),
    ("MATH2003", "Calculus III",
     "Multivariable calculus including partial derivatives, multiple integrals, vector fields, line integrals, and the theorems of Green, Stokes, and Gauss."),
    ("MATH2004", "Differential Equations",
     "First- and second-order ODEs, systems of differential equations, Laplace transforms, and series solutions. Modelling of physical, biological, and economic systems."),
    ("MATH2005", "Probability Theory",
     "Axiomatic probability, discrete and continuous random variables, joint distributions, expectation, variance, moment-generating functions, and the central limit theorem."),
    ("MATH3001", "Real Analysis",
     "Rigorous treatment of limits, continuity, differentiation, and integration using epsilon-delta proofs. Metric spaces, uniform convergence, and the Riemann integral are covered."),
    ("MATH3002", "Abstract Algebra",
     "Groups, rings, and fields with their homomorphisms and quotient structures. Applications include symmetry groups, polynomial rings, and an introduction to Galois theory."),
    ("MATH3003", "Numerical Methods",
     "Algorithms for root-finding, interpolation, numerical integration, and solving ODEs and linear systems. Error analysis, stability, and implementation in Python."),
    ("MATH3004", "Mathematical Modelling",
     "Formulation, analysis, and validation of mathematical models for real-world phenomena in ecology, epidemiology, finance, and engineering using differential equations and simulation."),
    ("MATH3005", "Graph Theory",
     "Connectivity, trees, planarity, graph colouring, matching, network flows, and Ramsey theory. Applications to scheduling, logistics, and social network analysis."),
    ("MATH3006", "Complex Analysis",
     "Complex functions, analytic functions, contour integration, Cauchy's theorem, residue theorem, and conformal mappings. Applications to fluid dynamics and signal processing."),
    ("MATH4001", "Topology",
     "Topological spaces, continuity, compactness, connectedness, quotient spaces, homotopy, and an introduction to homology groups. Builds geometric intuition alongside formal proof."),
    ("MATH4002", "Advanced Statistics",
     "Parametric and non-parametric inference, generalised linear models, survival analysis, bootstrap methods, and Bayesian credible intervals for real-world data."),
    ("MATH4003", "Stochastic Processes",
     "Markov chains, Poisson processes, continuous-time Markov chains, renewal theory, Brownian motion, and martingales. Applications to queuing, finance, and biology."),
    ("MATH4004", "Optimization Theory",
     "Linear programming, duality, interior-point methods, convex optimisation, Lagrangian relaxation, and integer programming with applications in operations research."),
    ("MATH4005", "Cryptography",
     "Classical and modern cryptographic systems: symmetric encryption, public-key cryptography, RSA, elliptic curves, hash functions, digital signatures, and zero-knowledge proofs."),
    ("MATH4006", "Game Theory",
     "Normal and extensive form games, Nash equilibria, mixed strategies, cooperative games, auction theory, and mechanism design with applications to economics and computing."),

    # Information Technology (15)
    ("INFO1001", "Information Systems",
     "Overview of how organisations use information systems to support operations and decision-making. Topics include hardware, software, databases, networks, and IT strategy."),
    ("INFO1002", "Digital Literacy",
     "Practical skills for the digital world: productivity software, cloud services, internet safety, data privacy, and critical evaluation of online information."),
    ("INFO2001", "Systems Analysis and Design",
     "Structured and object-oriented methodologies for analysing business requirements and designing IT solutions. Students produce system specifications including DFDs, ERDs, and use cases."),
    ("INFO2002", "IT Project Management",
     "Covers project planning, scope management, scheduling, resource allocation, risk management, and agile practices using tools such as Jira and MS Project."),
    ("INFO2003", "Data Communications",
     "Transmission media, data encoding, error detection and correction, flow control, multiplexing, and switching. Bridges theoretical communication concepts with practical networking."),
    ("INFO3001", "Enterprise Systems",
     "Architecture and implementation of enterprise-wide IT systems including ERP, CRM, and SCM. Integration challenges, change management, and vendor evaluation are discussed."),
    ("INFO3002", "IT Governance",
     "Frameworks for aligning IT with business strategy: COBIT, ITIL, and ISO 27001. Risk management, compliance, audit readiness, and IT policy development."),
    ("INFO3003", "Business Intelligence",
     "Techniques for transforming raw data into actionable insights: data warehousing, OLAP, dashboards, KPIs, and self-service BI using Power BI and Tableau."),
    ("INFO3004", "E-Commerce Systems",
     "Design and management of online business platforms: payment gateways, digital marketing, SEO, UX for e-commerce, security considerations, and legal requirements."),
    ("INFO3005", "IT Service Management",
     "Service lifecycle management based on ITIL v4: service strategy, design, transition, operation, and continual improvement. Prepares students for ITIL Foundation certification."),
    ("INFO4001", "Digital Transformation",
     "Strategies for leveraging digital technologies to reshape business models. Case studies examine organisations that have successfully navigated digital change."),
    ("INFO4002", "Data Warehousing",
     "Design and construction of data warehouses: dimensional modelling, star and snowflake schemas, ETL processes, data quality, and integration with analytics platforms."),
    ("INFO4003", "ERP Systems",
     "In-depth study of SAP and Oracle ERP platforms covering finance, HR, supply chain, and manufacturing modules, plus configuration and change management."),
    ("INFO4004", "IT Risk Management",
     "Identification, assessment, and mitigation of IT risks: threat modelling, business impact analysis, disaster recovery planning, and regulatory compliance frameworks."),
    ("INFO4005", "Health Informatics",
     "Application of IT to healthcare: electronic health records, clinical decision support, health data standards (HL7, FHIR), telemedicine, and patient data privacy."),

    # Cybersecurity (10)
    ("CYBR1001", "Introduction to Cybersecurity",
     "Foundational concepts in protecting digital assets: threats, vulnerabilities, attack types, access control, encryption basics, and the role of security policies."),
    ("CYBR2001", "Network Security",
     "Firewalls, intrusion detection and prevention systems, VPNs, wireless security, network monitoring, and hands-on labs involving packet analysis with Wireshark."),
    ("CYBR2002", "Ethical Hacking",
     "Offensive security techniques used by penetration testers: reconnaissance, scanning, exploitation, and post-exploitation in legal lab environments using Kali Linux."),
    ("CYBR3001", "Digital Forensics",
     "Collection, preservation, and analysis of digital evidence from computers, mobile devices, and networks. Chain of custody, forensic tools, and report writing."),
    ("CYBR3002", "Malware Analysis",
     "Static and dynamic analysis of malicious software including viruses, trojans, ransomware, and rootkits using Ghidra and behavioural sandbox environments."),
    ("CYBR3003", "Penetration Testing",
     "Structured security assessments: scoping, OWASP Top 10 vulnerabilities, Active Directory attacks, privilege escalation, and professional pentest report writing."),
    ("CYBR3004", "Secure Software Development",
     "Embedding security throughout the SDLC: threat modelling, secure coding practices, static analysis, code review, dependency management, and DevSecOps pipelines."),
    ("CYBR4001", "Advanced Cryptography",
     "Deep dive into cryptographic primitives: block ciphers, public-key infrastructure, key exchange protocols, post-quantum cryptography, and protocol analysis."),
    ("CYBR4002", "Incident Response",
     "Preparing for and managing security incidents: detection, containment, eradication, recovery, and lessons learned through tabletop breach simulations."),
    ("CYBR4003", "Security Architecture",
     "Designing secure enterprise architectures: zero-trust models, network segmentation, identity and access management, security operations centres, and SASE frameworks."),

    # Physics (10)
    ("PHYS1001", "Mechanics",
     "Newtonian mechanics covering kinematics, dynamics, work and energy, momentum, rotational motion, and gravitation. Laboratory experiments reinforce theoretical concepts."),
    ("PHYS1002", "Electricity and Magnetism",
     "Electric fields, Gauss's law, electric potential, capacitance, circuits, magnetic fields, Faraday's law, and Maxwell's equations at an introductory level."),
    ("PHYS2001", "Thermodynamics",
     "Laws of thermodynamics, heat engines, entropy, thermodynamic potentials, and phase transitions with applications to engines, refrigeration, and atmospheric physics."),
    ("PHYS2002", "Waves and Optics",
     "Mechanical and electromagnetic waves, superposition, interference, diffraction, polarisation, geometric optics, and an introduction to laser physics."),
    ("PHYS2003", "Modern Physics",
     "Special relativity, quantisation of light and matter, the Bohr model, wave-particle duality, the Schrodinger equation, and an introduction to nuclear physics."),
    ("PHYS3001", "Quantum Mechanics",
     "Mathematical formalism of quantum mechanics: Hilbert spaces, operators, the Schrodinger equation, the hydrogen atom, perturbation theory, and identical particles."),
    ("PHYS3002", "Electrodynamics",
     "Maxwell's equations in matter, electromagnetic waves, radiation, Poynting's theorem, multipole expansion, and introduction to special relativistic electrodynamics."),
    ("PHYS3003", "Statistical Mechanics",
     "Microstates, entropy, partition functions, canonical and grand canonical ensembles, Bose-Einstein and Fermi-Dirac statistics, and applications to ideal gases."),
    ("PHYS4001", "Solid State Physics",
     "Crystal structures, reciprocal lattice, phonons, electronic band theory, semiconductors, superconductivity, and magnetic properties of solids."),
    ("PHYS4002", "Nuclear Physics",
     "Nuclear structure, radioactive decay, nuclear reactions, fission, fusion, particle accelerators, and applications in medicine, energy, and national security."),

    # Chemistry (10)
    ("CHEM1001", "General Chemistry I",
     "Atomic structure, periodic trends, chemical bonding, stoichiometry, states of matter, and thermochemistry. Laboratory work introduces safe handling and quantitative techniques."),
    ("CHEM1002", "General Chemistry II",
     "Chemical equilibrium, acid-base chemistry, electrochemistry, chemical kinetics, and an introduction to coordination chemistry and nuclear chemistry."),
    ("CHEM2001", "Organic Chemistry I",
     "Structure and bonding of organic molecules, stereochemistry, and reactions of alkanes, alkenes, alkynes, and alkyl halides. Mechanisms and synthesis planning are emphasised."),
    ("CHEM2002", "Organic Chemistry II",
     "Reactions of alcohols, ethers, carbonyl compounds, carboxylic acids, amines, and aromatic compounds. Multi-step synthesis and spectroscopic structure determination."),
    ("CHEM2003", "Analytical Chemistry",
     "Quantitative and qualitative chemical analysis: gravimetric, volumetric, spectrophotometric, and chromatographic methods. Calibration, error analysis, and validation."),
    ("CHEM3001", "Physical Chemistry",
     "Quantum chemistry, molecular spectroscopy, chemical thermodynamics, reaction kinetics, and statistical thermodynamics bridging macroscopic and molecular theory."),
    ("CHEM3002", "Inorganic Chemistry",
     "Coordination compounds, crystal field theory, organometallic chemistry, solid-state structures, and industrial inorganic processes including catalysis and materials synthesis."),
    ("CHEM3003", "Biochemistry",
     "Structure and function of biomolecules: proteins, nucleic acids, carbohydrates, and lipids. Enzyme kinetics, metabolic pathways, and the molecular basis of disease."),
    ("CHEM4001", "Environmental Chemistry",
     "Chemical processes in natural and polluted environments: atmospheric chemistry, water quality, soil contamination, toxic substances, and green chemistry principles."),
    ("CHEM4002", "Medicinal Chemistry",
     "Drug discovery and development: pharmacokinetics, structure-activity relationships, target identification, lead optimisation, and regulatory pathways for new medicines."),

    # Biology (10)
    ("BIOL1001", "General Biology I",
     "Cellular structure and function, metabolism, photosynthesis, cell division, and genetics. Laboratory sessions include microscopy, enzyme assays, and DNA extraction."),
    ("BIOL1002", "General Biology II",
     "Organismal biology covering plant and animal systems, reproduction, development, and an introduction to ecology and evolutionary theory."),
    ("BIOL2001", "Cell Biology",
     "Membrane structure, intracellular trafficking, signal transduction, cytoskeleton, cell cycle regulation, and apoptosis. Current research methods in cell biology are discussed."),
    ("BIOL2002", "Genetics",
     "Mendelian and molecular genetics, chromosomal inheritance, mutation, DNA repair, gene expression regulation, and an introduction to genomics and genetic engineering."),
    ("BIOL2003", "Ecology",
     "Population dynamics, community interactions, ecosystem structure and function, energy flow, biogeochemical cycles, and conservation ecology in Caribbean contexts."),
    ("BIOL3001", "Microbiology",
     "Bacterial and viral structure, growth, metabolism, pathogenesis, and antimicrobial resistance. Clinical and environmental applications of microbiology are highlighted."),
    ("BIOL3002", "Molecular Biology",
     "Replication, transcription, translation, recombinant DNA technology, PCR, genome editing with CRISPR-Cas9, and high-throughput sequencing methods."),
    ("BIOL3003", "Evolutionary Biology",
     "Mechanisms of evolution: natural selection, genetic drift, gene flow, speciation, phylogenetics, and the fossil record. Case studies from Caribbean biodiversity."),
    ("BIOL4001", "Bioinformatics",
     "Computational analysis of biological sequence data: alignment algorithms, database searching, phylogenetic reconstruction, gene prediction, and structural bioinformatics."),
    ("BIOL4002", "Neuroscience",
     "Neuronal signalling, synaptic transmission, sensory systems, motor control, learning and memory, and the neurobiology of mental disorders including neuroimaging methods."),

    # Management & Business (15)
    ("MGMT1001", "Introduction to Management",
     "Foundations of management theory and practice: planning, organising, leading, and controlling. Classic and contemporary frameworks applied to Caribbean businesses."),
    ("MGMT1002", "Business Communication",
     "Effective written and oral communication in professional settings: emails, reports, presentations, meetings, and negotiations with emphasis on clarity and audience awareness."),
    ("MGMT2001", "Organizational Behaviour",
     "Individual and group behaviour in organisations: motivation theories, team dynamics, leadership styles, organisational culture, conflict resolution, and change management."),
    ("MGMT2002", "Human Resource Management",
     "Recruitment and selection, training and development, performance management, compensation, labour relations, and HR strategy aligned with organisational goals."),
    ("MGMT2003", "Operations Management",
     "Design and management of production processes: capacity planning, inventory control, quality management, lean principles, and supply chain optimisation."),
    ("MGMT3001", "Strategic Management",
     "Environmental scanning, competitive analysis, strategy formulation, implementation, and evaluation using Porter's Five Forces, SWOT, and the Balanced Scorecard."),
    ("MGMT3002", "Project Management",
     "Full project lifecycle: initiation, planning, execution, monitoring, and closure using Gantt charts, critical path analysis, and Agile sprints. Includes a capstone project."),
    ("MGMT3003", "Change Management",
     "Theories and practices for leading organisational change: Kotter's 8-step model, stakeholder management, resistance to change, and building a change-ready culture."),
    ("MGMT3004", "Supply Chain Management",
     "Design and optimisation of supply networks: procurement, logistics, warehousing, demand forecasting, supplier relationships, and sustainability in global supply chains."),
    ("MGMT4001", "Innovation Management",
     "Frameworks for fostering innovation: design thinking, open innovation, technology roadmapping, intellectual property strategy, and managing innovation portfolios."),
    ("MGMT4002", "Leadership and Ethics",
     "Theories of leadership including transformational, servant, and authentic leadership. Ethical decision-making, corporate social responsibility, and governance."),
    ("MGMT4003", "International Business",
     "Operating in a globalised economy: international trade theory, FDI, cross-cultural management, entry strategies, political and currency risk, and trade agreements."),
    ("MGMT4004", "Entrepreneurship",
     "From idea to venture: opportunity recognition, business model design, lean startup methodology, pitching to investors, legal structures, and managing early-stage growth."),
    ("MGMT4005", "Corporate Governance",
     "Board structures, shareholder rights, executive compensation, audit committees, transparency, accountability, and governance reforms in the Caribbean context."),
    ("MGMT4006", "Risk Management",
     "Enterprise risk management frameworks: risk identification, measurement, mitigation strategies, operational and financial risk, and building organisational resilience."),

    # Economics (10)
    ("ECON1001", "Microeconomics",
     "Consumer and producer theory, market structures, price determination, externalities, and public goods with real-world examples drawn from Caribbean markets."),
    ("ECON1002", "Macroeconomics",
     "National income accounting, economic growth, unemployment, inflation, fiscal and monetary policy, and open-economy macroeconomics with Caribbean case studies."),
    ("ECON2001", "Intermediate Microeconomics",
     "Advanced consumer and producer theory, general equilibrium, welfare economics, information economics, and game-theoretic models of competition."),
    ("ECON2002", "Intermediate Macroeconomics",
     "Dynamic macroeconomic models: IS-LM, Mundell-Fleming, real business cycle theory, New Keynesian models, and monetary policy in open economies."),
    ("ECON2003", "Development Economics",
     "Theories and evidence on economic development: poverty traps, inequality, human capital, governance, foreign aid, and the development experience of small island states."),
    ("ECON3001", "International Economics",
     "Comparative advantage, trade policy, tariffs and quotas, trade agreements, balance of payments, exchange rate determination, and the implications of globalisation."),
    ("ECON3002", "Public Finance",
     "Government expenditure, taxation, public debt, social insurance, and fiscal federalism. Cost-benefit analysis and the economics of government programmes."),
    ("ECON3003", "Econometrics",
     "OLS regression, hypothesis testing, heteroscedasticity, autocorrelation, panel data methods, instrumental variables, and causal inference using real economic datasets."),
    ("ECON4001", "Financial Economics",
     "Asset pricing, portfolio theory, CAPM, efficient markets hypothesis, derivatives pricing, term structure of interest rates, and financial crises."),
    ("ECON4002", "Behavioural Economics",
     "Psychological underpinnings of economic decisions: bounded rationality, heuristics and biases, prospect theory, nudge theory, and applications to policy design."),

    # Accounting & Finance (10)
    ("ACCT1001", "Financial Accounting I",
     "Accounting principles, the accounting cycle, financial statements, and double-entry bookkeeping. Students prepare and analyse balance sheets, income statements, and cash flow statements."),
    ("ACCT1002", "Financial Accounting II",
     "Advanced financial accounting: inventory valuation, depreciation, receivables, long-term liabilities, equity, and introduction to IFRS standards."),
    ("ACCT2001", "Management Accounting",
     "Cost classification, job and process costing, budgeting, variance analysis, and decision-making tools such as contribution margin and break-even analysis."),
    ("ACCT2002", "Taxation",
     "Principles of income taxation, corporate tax, VAT, payroll taxes, tax planning, and an overview of the Jamaican tax system and international tax treaties."),
    ("ACCT3001", "Auditing",
     "Audit planning, internal control evaluation, evidence gathering, audit risk, sampling, and reporting under ISA standards. Professional and ethical obligations of auditors."),
    ("ACCT3002", "Corporate Finance",
     "Capital budgeting, cost of capital, capital structure, dividend policy, working capital management, and financial risk management using derivatives."),
    ("ACCT3003", "Financial Reporting",
     "Preparation and interpretation of financial statements under IFRS: revenue recognition, leases, financial instruments, consolidation, and segment reporting."),
    ("ACCT4001", "Advanced Auditing",
     "Complex audit engagements: group audits, related-party transactions, going concern, fraud detection, forensic auditing, and public sector audit standards."),
    ("ACCT4002", "Forensic Accounting",
     "Detecting and investigating financial fraud: fraud schemes, forensic investigation techniques, litigation support, expert witness testimony, and anti-fraud controls."),
    ("ACCT4003", "International Accounting",
     "Comparative accounting systems, IFRS vs GAAP convergence, foreign currency translation, transfer pricing, and accounting for multinational enterprises."),

    # Statistics & Data Science (10)
    ("STAT1001", "Introductory Statistics",
     "Descriptive statistics, probability fundamentals, the normal distribution, confidence intervals, hypothesis tests, and simple linear regression using R or Python."),
    ("STAT2001", "Statistical Inference",
     "Point and interval estimation, maximum likelihood, Bayesian estimation, likelihood ratio tests, and asymptotic theory. Rigorous treatment of classical inference."),
    ("STAT2002", "Regression Analysis",
     "Simple and multiple linear regression, model selection, diagnostics, heteroscedasticity, logistic regression, and Poisson regression with real datasets."),
    ("STAT3001", "Multivariate Analysis",
     "Principal component analysis, factor analysis, cluster analysis, discriminant analysis, MANOVA, and canonical correlation for high-dimensional data."),
    ("STAT3002", "Time Series Analysis",
     "Stationarity, ARIMA models, seasonal decomposition, forecasting, GARCH models for volatility, and spectral analysis applied to economic and environmental data."),
    ("STAT3003", "Bayesian Statistics",
     "Bayesian inference, prior and posterior distributions, MCMC methods, hierarchical models, and Bayesian model comparison using Stan or PyMC3."),
    ("STAT4001", "Data Mining",
     "Knowledge discovery in large datasets: association rules, classification trees, clustering algorithms, anomaly detection, and evaluation of predictive models."),
    ("STAT4002", "Statistical Learning",
     "Modern supervised and unsupervised learning: regularised regression, random forests, boosting, support vector machines, and neural networks from a statistical perspective."),
    ("STAT4003", "Survey Methodology",
     "Design of surveys and sampling plans: simple random, stratified, cluster, and systematic sampling. Questionnaire design, non-response bias, and analysis of complex survey data."),
    ("STAT4004", "Simulation and Modelling",
     "Monte Carlo simulation, discrete-event simulation, variance reduction techniques, agent-based modelling, and model validation applied to queuing and supply chain systems."),

    # English & Communications (10)
    ("ENGL1001", "Academic Writing",
     "Developing university-level writing skills: argumentation, thesis development, paragraph structure, academic citation, and revision strategies across disciplines."),
    ("ENGL1002", "Technical Communication",
     "Writing and presenting technical information clearly to specialist and non-specialist audiences. Covers instructions, specifications, reports, and user documentation."),
    ("ENGL2001", "Research Writing",
     "Conducting literature reviews, evaluating sources, APA and MLA citation, writing research proposals, and producing polished research papers in the student's discipline."),
    ("ENGL2002", "Professional Communication",
     "Communication strategies for the workplace: business writing, intercultural communication, email etiquette, meeting facilitation, and professional presentations."),
    ("ENGL3001", "Media and Society",
     "Critical analysis of mass media and digital platforms: media ownership, representation, news framing, social media dynamics, misinformation, and media literacy."),
    ("ENGL3002", "Digital Communication",
     "Creating and managing content across digital channels: social media strategy, multimedia storytelling, SEO writing, and analytics for measuring communication impact."),
    ("ENGL3003", "Public Speaking",
     "Developing confidence and competence in oral communication: speech structure, delivery techniques, visual aids, impromptu speaking, and persuasive speaking."),
    ("ENGL4001", "Science Communication",
     "Translating complex scientific findings for public audiences: press releases, science journalism, public engagement events, data visualisation, and science podcasting."),
    ("ENGL4002", "Grant and Proposal Writing",
     "Crafting compelling proposals for research grants, project funding, and NGO applications. Covers needs statements, logic models, evaluation frameworks, and budgets."),
    ("ENGL4003", "Advanced Technical Writing",
     "Advanced documentation projects: API documentation, white papers, policy briefs, and managing documentation processes in professional or open-source contexts."),

    # Psychology (10)
    ("PSYC1001", "Introduction to Psychology",
     "Survey of major areas: biological bases of behaviour, sensation and perception, learning, memory, cognition, development, personality, social psychology, and mental health."),
    ("PSYC2001", "Cognitive Psychology",
     "Mental processes underlying attention, perception, memory, language, problem-solving, and decision-making. Classic experiments and current cognitive neuroscience findings."),
    ("PSYC2002", "Social Psychology",
     "How people think, feel, and behave in social contexts: attitudes, persuasion, conformity, obedience, group dynamics, prejudice, and prosocial behaviour."),
    ("PSYC2003", "Developmental Psychology",
     "Physical, cognitive, and socio-emotional development from conception through old age. Theories of Piaget, Vygotsky, Erikson, and attachment theory."),
    ("PSYC3001", "Abnormal Psychology",
     "Classification, aetiology, and treatment of psychological disorders: anxiety, mood, psychotic, personality, and neurodevelopmental disorders using DSM-5 criteria."),
    ("PSYC3002", "Research Methods in Psychology",
     "Experimental design, sampling strategies, questionnaire construction, observational methods, ethical principles, and statistical analysis using SPSS or R."),
    ("PSYC3003", "Neuropsychology",
     "Brain-behaviour relationships: functional neuroanatomy, neuropsychological assessment, effects of brain injury and disease, and rehabilitation approaches."),
    ("PSYC4001", "Industrial Psychology",
     "Applying psychology to the workplace: employee selection, training effectiveness, motivation, job satisfaction, leadership, and occupational health."),
    ("PSYC4002", "Health Psychology",
     "Psychological factors in physical health: stress and illness, health-related behaviours, patient communication, chronic disease management, and behaviour interventions."),
    ("PSYC4003", "Forensic Psychology",
     "Psychology applied to legal settings: risk assessment, offender profiling, eyewitness testimony reliability, competency evaluations, and treatment of offenders."),

    # Electrical Engineering (10)
    ("ELEC1001", "Circuit Analysis",
     "DC and AC circuit theory: Kirchhoff's laws, node and mesh analysis, Thevenin and Norton equivalents, capacitors, inductors, and frequency response."),
    ("ELEC1002", "Digital Electronics",
     "Boolean algebra, logic gates, combinational and sequential circuits, flip-flops, registers, counters, and introduction to FPGA programming with VHDL."),
    ("ELEC2001", "Signals and Systems",
     "Continuous and discrete-time signals, convolution, Fourier series and transform, Laplace transform, Z-transform, sampling theorem, and filter design."),
    ("ELEC2002", "Microprocessors",
     "Architecture and programming of microprocessors: instruction sets, assembly language, memory interfacing, interrupts, and peripheral control on embedded platforms."),
    ("ELEC3001", "Control Systems",
     "Open and closed-loop control, transfer functions, stability analysis, root locus, Bode plots, PID controllers, and state-space representation."),
    ("ELEC3002", "Power Systems",
     "Generation, transmission, and distribution of electrical power: transformers, power flow analysis, fault analysis, protection systems, and renewable integration."),
    ("ELEC3003", "Communications Engineering",
     "Modulation techniques (AM, FM, QAM, OFDM), noise in communication systems, information theory, channel capacity, and introduction to wireless standards."),
    ("ELEC4001", "VLSI Design",
     "Design of integrated circuits using CMOS technology: logic synthesis, timing analysis, layout design, power optimisation, and simulation with CAD tools."),
    ("ELEC4002", "Robotics and Automation",
     "Robot kinematics and dynamics, trajectory planning, sensors and actuators, computer vision for robotics, PLC programming, and industrial automation systems."),
    ("ELEC4003", "Renewable Energy Systems",
     "Solar, wind, hydro, and geothermal energy technologies: resource assessment, system design, grid integration, energy storage, and economic analysis."),

    # Environmental Science (10)
    ("ENVS1001", "Introduction to Environmental Science",
     "Earth's natural systems and human impacts: ecosystems, biodiversity, atmosphere, hydrosphere, land use, pollution, climate change, and sustainable development principles."),
    ("ENVS2001", "Climate Change Science",
     "Physical science of climate change: greenhouse gases, climate feedbacks, climate models, observed and projected impacts, mitigation pathways, and climate policy."),
    ("ENVS2002", "Environmental Policy",
     "Policy instruments for environmental management: regulation, market-based mechanisms, international agreements, and the politics of environmental decision-making."),
    ("ENVS3001", "Environmental Impact Assessment",
     "EIA process and methodology: scoping, baseline studies, impact prediction, mitigation, public participation, and reviewing EIA reports for infrastructure projects."),
    ("ENVS3002", "Conservation Biology",
     "Principles for protecting biodiversity: extinction risk, habitat fragmentation, invasive species, protected area management, and restoration ecology with Caribbean examples."),
    ("ENVS3003", "Water Resources Management",
     "Hydrology, groundwater and surface water systems, water quality, irrigation, integrated water resource management, and freshwater challenges in the Caribbean."),
    ("ENVS4001", "Sustainable Development",
     "Concepts and frameworks for sustainability: the SDGs, circular economy, green infrastructure, corporate sustainability reporting, and measuring well-being beyond GDP."),
    ("ENVS4002", "Pollution Control",
     "Sources, fate, and remediation of air, water, and soil pollutants. Treatment technologies, emission standards, waste management, and occupational exposure limits."),
    ("ENVS4003", "Remote Sensing and GIS",
     "Satellite imagery, aerial photography, spatial data analysis, GIS, and their applications in land cover mapping, disaster management, and ecology."),
    ("ENVS4004", "Environmental Law",
     "National and international environmental law: legislation, treaties, enforcement mechanisms, environmental rights, climate litigation, and Caribbean regional frameworks."),

    # Social Sciences (10)
    ("SOCI1001", "Introduction to Sociology",
     "Core sociological concepts: socialisation, culture, social structure, stratification, race, gender, deviance, and social institutions with focus on Caribbean society."),
    ("SOCI2001", "Social Research Methods",
     "Quantitative and qualitative research design: surveys, interviews, ethnography, content analysis, sampling, and ethical considerations in social research."),
    ("SOCI2002", "Caribbean Society and Culture",
     "Historical and contemporary analysis of Caribbean societies: colonialism, creolisation, diaspora, identity, religion, popular culture, and regional integration."),
    ("SOCI3001", "Gender Studies",
     "Theories of gender and sexuality, feminist thought, masculinity studies, gender-based violence, reproductive rights, and gender policy in the Caribbean."),
    ("SOCI3002", "Race and Ethnicity",
     "Theoretical frameworks for understanding race and ethnicity: racism, discrimination, multiculturalism, ethnic conflict, and Afro-Caribbean and Indo-Caribbean identities."),
    ("HIST1001", "World History I",
     "Survey of world history from ancient civilisations through the early modern period: Mesopotamia, classical empires, medieval Europe, and the age of exploration."),
    ("HIST1002", "Caribbean History",
     "From pre-Columbian societies through colonisation, the transatlantic slave trade, emancipation, independence movements, and post-colonial development in the Caribbean."),
    ("GEOG1001", "Physical Geography",
     "Earth's physical systems: plate tectonics, geomorphology, climate and weather, hydrology, soils, and biomes. Field techniques for observing physical environments."),
    ("GEOG2001", "Urban Geography",
     "Growth and structure of cities: urbanisation trends, land use, housing, transportation, inequality, smart cities, and sustainability in developing countries."),
    ("GEOG3001", "Geographic Information Systems",
     "Principles and practice of GIS: vector and raster data models, spatial analysis, cartographic design, and applications in urban planning and public health."),
]

# ── validate course pool ───────────────────────────────────────────────────────
assert len(COURSE_POOL) == 200,         f"Expected 200 courses, got {len(COURSE_POOL)}"
assert len({r[0] for r in COURSE_POOL}) == 200, "Duplicate course IDs!"
assert len({r[1] for r in COURSE_POOL}) == 200, "Duplicate course names!"

COURSE_PREFIX_DEPT = {
    "COMP": "Computer Science",      "MATH": "Mathematics",
    "INFO": "Information Technology","CYBR": "Cybersecurity",
    "PHYS": "Physics",               "CHEM": "Chemistry",
    "BIOL": "Biology",               "MGMT": "Management",
    "ECON": "Economics",             "ACCT": "Accounting",
    "STAT": "Statistics",            "ENGL": "English",
    "PSYC": "Psychology",            "ELEC": "Electrical Engineering",
    "ENVS": "Environmental Science", "SOCI": "Social Sciences",
    "HIST": "Social Sciences",       "GEOG": "Social Sciences",
}
ALL_DEPTS = sorted(set(COURSE_PREFIX_DEPT.values()))

SECTION_TITLES = {
    "COMP": ["Course Overview","Core Theory","Programming Lab","Algorithm Design",
             "System Implementation","Testing and Debugging","Advanced Topics","Capstone Project"],
    "MATH": ["Foundations","Key Theorems","Worked Examples","Problem Sets",
             "Real-World Applications","Proofs and Derivations","Extension Topics","Revision"],
    "default": ["Introduction","Core Concepts","Practical Sessions","Case Studies",
                "Advanced Material","Assessment Preparation","Research Topics","Review"],
}

ITEM_TYPES  = ["Video Lecture","Reading Material","Quiz","Exercise","Lab Report","Assignment"]
EVENT_TYPES = ["Lecture","Tutorial","Midterm Exam","Final Exam",
               "Assignment Deadline","Workshop","Guest Lecture"]

ASSIGNMENT_TEMPLATES = [
    ("Assignment 1: Foundations of {name}",
     "Demonstrate your understanding of the foundational concepts covered in the first weeks of {name}. Submit a written report or coded solution as directed by your lecturer."),
    ("Assignment 2: Applied Problems in {name}",
     "Apply the techniques studied in {name} to a set of real-world problems. Show all working and justify your chosen approach clearly."),
    ("Midterm Project: {name} Case Study",
     "Select a real-world case study relevant to {name} and analyse it using the frameworks introduced in this course. Submit a structured report of 1200-1500 words."),
    ("Assignment 3: Advanced Topics in {name}",
     "Explore an advanced area of {name} not covered in lectures. Produce a short technical report or working implementation with documentation."),
    ("Final Project: {name} Implementation",
     "Independently design and implement a project that demonstrates mastery of the key skills developed throughout {name}. Full details in the course outline."),
    ("Lab Report: {name} Practical",
     "Write up the results of the {name} practical session, including methodology, results, analysis, and a critical evaluation of your findings."),
    ("Essay: Current Issues in {name}",
     "Write a 1500-word essay on a contemporary issue in {name}, drawing on at least five recent peer-reviewed sources."),
]

FORUM_TEMPLATES = [
    ("General Discussion",
     "A space for students to discuss course material, ask questions, and share relevant resources."),
    ("Assignment Help",
     "Post questions and tips related to course assignments and projects. Be mindful of academic integrity guidelines."),
    ("Exam Preparation",
     "Discuss exam topics, share study guides, and coordinate group study sessions with your classmates."),
    ("Announcements",
     "Official announcements from the course lecturer regarding deadlines, schedule changes, and updates."),
]

THREAD_STARTERS = [
    "Can someone explain {}?",
    "Help needed with {}",
    "Question about {}",
    "My notes on {} – feel free to add",
    "Tips for the {} assignment?",
    "Study group for {} – who is in?",
    "Interesting resource related to {}",
    "Confused about {} – anyone else?",
]

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════
def main():
    today          = date.today()
    semester_start = today - timedelta(days=90)

    print("Generating data …\n")

    # ── 1. GENERATE USER DATA ─────────────────────────────────────────────────
    print(f"  Building {NUM_ADMINS} admins, {NUM_LECTURERS} lecturers, "
          f"{NUM_STUDENTS:,} students …")

    user_rows   = []   # (name, email, password, user_type)
    admin_ids   = []
    lect_ids    = []
    stud_ids    = []
    uid = 1            # simulated AUTO_INCREMENT

    def add_user(name, utype):
        nonlocal uid
        email = make_email(name)
        pw    = hash_pw(name.lower().replace(" ", "") + "Pass1!")
        user_rows.append((name[:50], email[:50], pw, utype))
        assigned_uid = uid
        uid += 1
        return assigned_uid

    for _ in range(NUM_ADMINS):
        admin_ids.append(add_user(fake.name(), "Admin"))
    for _ in range(NUM_LECTURERS):
        lect_ids.append(add_user(fake.name(), "Lecturer"))
    for _ in range(NUM_STUDENTS):
        stud_ids.append(add_user(fake.name(), "Student"))

    # ── 2. SUB-TABLE DATA ─────────────────────────────────────────────────────
    admin_rows = [(i,) for i in admin_ids]

    lect_rows = []
    for i, lid in enumerate(lect_ids):
        dept = ALL_DEPTS[i % len(ALL_DEPTS)]
        lect_rows.append((lid, dept))

    stud_rows = []
    for sid in stud_ids:
        enroll = rand_date(date(2018, 1, 1), today)
        stud_rows.append((sid, enroll))

    # ── 3. MAINTAINS (lecturer → course) ──────────────────────────────────────
    print("  Assigning lecturers to courses …")
    course_ids  = [r[0] for r in COURSE_POOL]

    # Build dept → lecturer list
    lect_dept   = {lect_rows[i][0]: lect_rows[i][1] for i in range(len(lect_rows))}
    dept_lects  = {}
    for lid, dept in lect_dept.items():
        dept_lects.setdefault(dept, []).append(lid)

    lect_load   = {lid: 0 for lid in lect_ids}   # courses per lecturer
    course_lect = {cid: [] for cid in course_ids}

    def course_dept(cid):
        return COURSE_PREFIX_DEPT.get(cid[:4], "Computer Science")

    # Pass 1: assign at least 1 lecturer per course from matching dept
    shuffled_lects = lect_ids[:]
    random.shuffle(shuffled_lects)
    fallback_idx = 0
    for cid in course_ids:
        dept  = course_dept(cid)
        pool  = [l for l in dept_lects.get(dept, [])
                 if lect_load[l] < 5 and l not in course_lect[cid]]
        if not pool:   # cross-dept fallback
            pool = [l for l in shuffled_lects
                    if lect_load[l] < 5 and l not in course_lect[cid]]
        lid = random.choice(pool)
        course_lect[cid].append(lid)
        lect_load[lid] += 1

    # Pass 2: give ~40% of courses a second lecturer
    for cid in random.sample(course_ids, k=int(len(course_ids) * 0.4)):
        dept = course_dept(cid)
        pool = [l for l in dept_lects.get(dept, lect_ids)
                if lect_load[l] < 5 and l not in course_lect[cid]]
        if not pool:
            pool = [l for l in lect_ids
                    if lect_load[l] < 5 and l not in course_lect[cid]]
        if pool:
            lid = random.choice(pool)
            course_lect[cid].append(lid)
            lect_load[lid] += 1

    # Pass 3: guarantee every lecturer teaches >= 1 course (constraint g)
    for lid in lect_ids:
        if lect_load[lid] == 0:
            for cid in random.sample(course_ids, len(course_ids)):
                if lect_load[lid] < 5 and lid not in course_lect[cid]:
                    course_lect[cid].append(lid)
                    lect_load[lid] += 1
                    break

    maintains_rows = [
        (lid, cid)
        for cid, lids in course_lect.items()
        for lid in lids
    ]

    # ── 4. ASSIGNED_TO (student → course) ─────────────────────────────────────
    print("  Enrolling students in courses (this may take 30–60 s) …")
    course_member_count = {cid: 0 for cid in course_ids}
    stud_courses        = {sid: set() for sid in stud_ids}   # sid → set of cids

    # Pass 1: seed every course with at least 10 distinct students (constraint e)
    for cid in course_ids:
        sample = random.sample(stud_ids, 10)
        for sid in sample:
            if len(stud_courses[sid]) < 6:   # honour constraint c
                stud_courses[sid].add(cid)
                course_member_count[cid] += 1

    # Pass 2: bring every student up to 3–6 courses (constraints c & d)
    for sid in stud_ids:
        current = len(stud_courses[sid])
        if current >= 3:
            continue
        target    = random.randint(3, 6)
        needed    = target - current
        available = [c for c in course_ids if c not in stud_courses[sid]]
        chosen    = random.sample(available, min(needed, len(available)))
        for cid in chosen:
            stud_courses[sid].add(cid)
            course_member_count[cid] += 1

    # Pass 3: top-up any course still under 10 students (constraint e)
    for cid in course_ids:
        deficit = 10 - course_member_count[cid]
        if deficit <= 0:
            continue
        candidates = [s for s in stud_ids
                      if cid not in stud_courses[s] and len(stud_courses[s]) < 6]
        for sid in random.sample(candidates, min(deficit, len(candidates))):
            stud_courses[sid].add(cid)
            course_member_count[cid] += 1

    assigned_rows = []
    for sid, cids in stud_courses.items():
        for cid in cids:
            enroll_date = rand_date(date(2018, 1, 1), today)
            assigned_rows.append((sid, cid, enroll_date))

    # ── 5. SECTIONS ───────────────────────────────────────────────────────────
    print("  Building sections …")
    sec_rows = []
    sec_map  = {}     # cid → [section_nums]
    for cid, cname, _ in COURSE_POOL:
        prefix  = cid[:4]
        titles  = SECTION_TITLES.get(prefix, SECTION_TITLES["default"])
        n       = random.randint(5, 8)
        chosen  = (titles * 2)[:n]   # repeat list if n > len(titles)
        sec_map[cid] = list(range(1, n + 1))
        for snum, stitle in zip(sec_map[cid], chosen):
            sec_rows.append((cid, snum, stitle[:50], snum))

    # ── 6. SECTION ITEMS ──────────────────────────────────────────────────────
    print("  Building section items …")
    item_rows = []
    for cid, cname, _ in COURSE_POOL:
        for snum in sec_map[cid]:
            for _ in range(random.randint(2, 5)):
                itype   = random.choice(ITEM_TYPES)
                ititle  = f"{itype} – {cname}"[:50]
                content = (f"This {itype.lower()} covers key topics from {cname}. "
                           f"Students are expected to engage with the material "
                           f"before the next scheduled session.")
                item_rows.append((cid, snum, ititle, itype, content))

    # ── 7. DISCUSSION FORUMS ──────────────────────────────────────────────────
    print("  Building discussion forums …")
    forum_rows   = []
    forum_map    = {}    # cid → [(forum_title, forum_seq_id)] – seq used for threads
    forum_seq_id = 1
    for cid, cname, _ in COURSE_POOL:
        forum_map[cid] = []
        templates = random.sample(FORUM_TEMPLATES, k=random.randint(1, 3))
        for ftitle, fdesc in templates:
            full_title = f"{ftitle} – {cname}"[:100]
            forum_rows.append((cid, full_title, fdesc))
            forum_map[cid].append(forum_seq_id)
            forum_seq_id += 1

    # ── 8. DISCUSSION THREADS ─────────────────────────────────────────────────
    print("  Building discussion threads …")
    all_user_ids = admin_ids + lect_ids + stud_ids
    thr_rows     = []
    for cid, cname, _ in COURSE_POOL:
        for fid in forum_map.get(cid, []):
            for _ in range(random.randint(3, 8)):
                uid_t   = random.choice(all_user_ids)
                word    = random.choice(cname.split())
                title   = random.choice(THREAD_STARTERS).format(word)[:50]
                content = (f"Hi everyone, I have been working through {cname} "
                           f"and wanted to discuss {word.lower()}. "
                           f"Any thoughts or resources would be appreciated.")
                dt      = fake.date_time_between(start_date="-2y", end_date="now")
                thr_rows.append((cid, fid, uid_t, None, title, content, dt))

    # ── 9. CALENDAR EVENTS ────────────────────────────────────────────────────
    print("  Building calendar events …")
    ev_rows = []
    for cid, cname, _ in COURSE_POOL:
        fixed = [
            (f"{cname[:30]} – Midterm Exam",       semester_start + timedelta(weeks=6),  "Midterm Exam"),
            (f"{cname[:30]} – Final Exam",          semester_start + timedelta(weeks=13), "Final Exam"),
            (f"{cname[:30]} – Assignment 1 Due",    semester_start + timedelta(weeks=3),  "Assignment Deadline"),
            (f"{cname[:30]} – Assignment 2 Due",    semester_start + timedelta(weeks=8),  "Assignment Deadline"),
            (f"{cname[:30]} – Project Submission",  semester_start + timedelta(weeks=12), "Assignment Deadline"),
        ]
        for etitle, edate, etype in fixed:
            ev_rows.append((cid, etitle[:50],
                            f"Scheduled {etype.lower()} for {cname}.", edate, etype))
        for _ in range(random.randint(3, 6)):
            etype = random.choice(["Lecture","Tutorial","Workshop","Guest Lecture"])
            edate = rand_date(semester_start, semester_start + timedelta(weeks=14))
            ev_rows.append((cid, f"{cname[:36]} – {etype}"[:50],
                            f"Regular {etype.lower()} session for {cname}.",
                            edate, etype))

    # ── 10. ASSIGNMENTS ───────────────────────────────────────────────────────
    print("  Building assignments …")
    asgn_rows = []
    asgn_map  = {cid: [] for cid in course_ids}   # cid → [seq_id]
    asgn_seq  = 1
    for cid, cname, _ in COURSE_POOL:
        templates = random.sample(ASSIGNMENT_TEMPLATES, k=random.randint(3, 5))
        for i, (ttmpl, dtmpl) in enumerate(templates):
            title = ttmpl.format(name=cname)[:50]
            desc  = dtmpl.format(name=cname)
            due   = semester_start + timedelta(weeks=3 * (i + 1))
            marks = random.choice([50, 60, 75, 100])
            asgn_rows.append((cid, title, desc, due, marks))
            asgn_map[cid].append(asgn_seq)
            asgn_seq += 1

    # ── 11. SUBMISSIONS ───────────────────────────────────────────────────────
    print("  Building submissions …")
    course_studs = {cid: [] for cid in course_ids}
    for sid, cids in stud_courses.items():
        for cid in cids:
            course_studs[cid].append(sid)

    sub_rows = []
    for cid, aids in asgn_map.items():
        enrolled = course_studs.get(cid, [])
        if not enrolled:
            continue
        for aid in aids:
            # 70% submission rate, capped at 300 per assignment to keep file size sane
            submitters = random.sample(enrolled, k=int(len(enrolled) * 0.70))
            submitters = submitters[:300]
            for sid in submitters:
                grade   = random.randint(0, 100) if random.random() > 0.15 else None
                sub_dt  = fake.date_time_between(start_date="-1y", end_date="now")
                sub_rows.append((sid, aid, sub_dt, grade))

    # ── CONSTRAINT VERIFICATION ───────────────────────────────────────────────
    print("\n  Verifying constraints …")
    assert len(stud_ids)   >= 100_000, "FAIL: fewer than 100,000 students"
    assert len(COURSE_POOL) >= 200,     "FAIL: fewer than 200 courses"
    for sid, cids in stud_courses.items():
        assert len(cids) <= 6, f"FAIL: student {sid} enrolled in {len(cids)} courses (max 6)"
        assert len(cids) >= 3, f"FAIL: student {sid} enrolled in {len(cids)} courses (min 3)"
    for cid in course_ids:
        assert course_member_count[cid] >= 10, \
            f"FAIL: course {cid} has only {course_member_count[cid]} students (min 10)"
    for lid in lect_ids:
        assert lect_load[lid] >= 1, f"FAIL: lecturer {lid} teaches 0 courses"
        assert lect_load[lid] <= 5, f"FAIL: lecturer {lid} teaches {lect_load[lid]} courses"
    print("  All constraints PASSED.\n")

    # ── WRITE SQL FILE ────────────────────────────────────────────────────────
    print(f"Writing {OUTPUT_FILE} …")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:

        f.write("-- ============================================================\n")
        f.write("-- COMP3161_Final_Proj  –  Seed data\n")
        f.write(f"-- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- ============================================================\n\n")
        f.write("USE COMP3161_Final_Proj;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n\n")

        # User
        print("  Writing User …")
        write_inserts(f, "User",
                      ["name","email","password","user_type"],
                      user_rows)

        # Admin
        print("  Writing Admin …")
        write_inserts(f, "Admin", ["user_id"], admin_rows)

        # Lecturer
        print("  Writing Lecturer …")
        write_inserts(f, "Lecturer", ["user_id","department"], lect_rows)

        # Student
        print("  Writing Student …")
        write_inserts(f, "Student", ["user_id","date_enrolled"], stud_rows)

        # Course
        print("  Writing Course …")
        write_inserts(f, "Course",
                      ["course_id","course_name","description"],
                      COURSE_POOL)

        # Maintains
        print("  Writing Maintains …")
        write_inserts(f, "Maintains", ["user_id","course_id"], maintains_rows)

        # Assigned_To
        print("  Writing Assigned_To …")
        write_inserts(f, "Assigned_To",
                      ["user_id","course_id","enrollment_date"],
                      assigned_rows)

        # Section
        print("  Writing Section …")
        write_inserts(f, "Section",
                      ["course_id","section_num","title","sec_order"],
                      sec_rows)

        # Section_Item
        print("  Writing Section_Item …")
        write_inserts(f, "Section_Item",
                      ["course_id","section_num","title","type","content"],
                      item_rows)

        # Discussion_Forum
        print("  Writing Discussion_Forum …")
        write_inserts(f, "Discussion_Forum",
                      ["course_id","title","description"],
                      forum_rows)

        # Discussion_Thread
        print("  Writing Discussion_Thread …")
        write_inserts(f, "Discussion_Thread",
                      ["course_id","forum_id","user_id","parent_thread_id",
                       "title","content","created_date"],
                      thr_rows)

        # Calendar_Event
        print("  Writing Calendar_Event …")
        write_inserts(f, "Calendar_Event",
                      ["course_id","title","description","event_date","event_type"],
                      ev_rows)

        # Assignment
        print("  Writing Assignment …")
        write_inserts(f, "Assignment",
                      ["course_id","title","description","due_date","max_marks"],
                      asgn_rows)

        # Submission
        print("  Writing Submission …")
        write_inserts(f, "Submission",
                      ["user_id","assignment_id","submission_date","grade"],
                      sub_rows)

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n")

    # ── SUMMARY ───────────────────────────────────────────────────────────────
    import os
    size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\n=== Done! Output: {OUTPUT_FILE}  ({size_mb:.1f} MB) ===")
    print(f"  {'Table':<25} {'Rows':>12}")
    print(f"  {'-'*38}")
    counts = [
        ("User",              len(user_rows)),
        ("Admin",             len(admin_rows)),
        ("Lecturer",          len(lect_rows)),
        ("Student",           len(stud_rows)),
        ("Course",            len(COURSE_POOL)),
        ("Maintains",         len(maintains_rows)),
        ("Assigned_To",       len(assigned_rows)),
        ("Section",           len(sec_rows)),
        ("Section_Item",      len(item_rows)),
        ("Discussion_Forum",  len(forum_rows)),
        ("Discussion_Thread", len(thr_rows)),
        ("Calendar_Event",    len(ev_rows)),
        ("Assignment",        len(asgn_rows)),
        ("Submission",        len(sub_rows)),
    ]
    for name, cnt in counts:
        print(f"  {name:<25} {cnt:>12,}")

    print(f"\nImport with:")
    print(f"  mysql -u root -p COMP3161_Final_Proj < {OUTPUT_FILE}")


if __name__ == "__main__":
    main()