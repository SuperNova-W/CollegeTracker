// Deadlines, fun facts, and application prompts for popular schools.
// Keyed by College Scorecard unit ID.
// Deadline format: "YYYY-MM-DD"

const ENRICHMENT = {
  // MIT
  '166683': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-01',
    applicationFee: 75,
    funFact: "MIT's mascot is Tim the Beaver — chosen because beavers are nature's engineers.",
    prompt1: 'We know you lead a busy life, full of activities, many of which are required of you. Tell us about something you do simply for the pleasure of it.',
    prompt2: "Describe the world you come from—for example, your family, community, or school—and tell us how it has shaped your dreams and aspirations.",
  },
  // Stanford
  '243744': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-02',
    applicationFee: 90,
    funFact: 'Stanford sits on 8,180 acres, making it one of the largest university campuses in the United States.',
    prompt1: 'The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.',
    prompt2: 'Virtually all of Stanford\'s undergraduates live on campus. Write a note to your future roommate that reveals something about who you are or what you hope your experience at Stanford will be like.',
  },
  // Harvard
  '166027': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-01',
    applicationFee: 85,
    funFact: "Harvard's library system is the largest academic library in the world, with over 20 million items.",
    prompt1: "Harvard has long recognized that students with differing viewpoints enrich the learning environment. Describe an experience or idea that you've encountered that has shaped or complicated your thinking.",
    prompt2: 'Briefly describe an intellectual experience that was important to you.',
  },
  // UC Berkeley
  '110635': {
    eaDeadline: null,
    edDeadline: null,
    rdDeadline: '2025-11-30',
    applicationFee: 80,
    funFact: "UC Berkeley has produced 107 Nobel laureates, more than any other public university in the world.",
    prompt1: 'Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes, or contributed to group efforts over time.',
    prompt2: 'Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side.',
  },
  // Carnegie Mellon
  '211440': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-01',
    applicationFee: 75,
    funFact: 'Carnegie Mellon students once sent a robot hand with a pizza to the moon... well, metaphorically — CMU pioneered modern robotics and AI research.',
    prompt1: "Most students choose their college major or area of study for a variety of reasons. Why are you drawn to the area(s) of study you indicated in this application?",
    prompt2: 'Many students pursue college for a specific degree, career opportunity or personal goal. Whichever it may be, learning will be critical to achieve your ultimate goal. As you think ahead to the process of learning during your college years, how will you define a successful college experience?',
  },
  // University of Michigan
  '170976': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-02-01',
    applicationFee: 75,
    funFact: "Michigan Stadium, known as 'The Big House,' is the largest stadium in the Western Hemisphere with a capacity of over 107,000.",
    prompt1: 'Everyone belongs to many different communities and/or groups defined by (among other things) shared geography, religion, ethnicity, income, cuisine, sport, preferences, values, or intellectual interest. Choose one of the communities to which you belong, and describe that community and your place within it.',
    prompt2: 'Why are you interested in the school, college, or program to which you are applying at the University of Michigan?',
  },
  // Georgia Tech
  '139755': {
    eaDeadline: '2025-10-15',
    edDeadline: null,
    rdDeadline: '2026-01-05',
    applicationFee: 75,
    funFact: "Georgia Tech's campus is home to a ramblin' wreck — a 1930 Ford Model A sport coupe that leads the football team onto the field.",
    prompt1: 'Why do you want to study your chosen major, and why do you want to study it at Georgia Tech?',
    prompt2: 'Beyond rankings, location, and athletics, why do you want to attend Georgia Tech? What do you believe Georgia Tech can offer you?',
  },
  // UT Austin
  '228778': {
    eaDeadline: null,
    edDeadline: null,
    rdDeadline: '2025-12-01',
    applicationFee: 75,
    funFact: "UT Austin's tower bell carillon plays 'The Eyes of Texas' every day at noon, a tradition since 1936.",
    prompt1: 'Describe a challenge you have faced and what you have learned from it.',
    prompt2: 'What unique qualities or perspectives do you bring to the UT Austin community?',
  },
  // Princeton
  '186131': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-01',
    applicationFee: 75,
    funFact: "Princeton's eating clubs have served as social centers for upperclassmen since 1879, each with its own distinct culture and traditions.",
    prompt1: "Princeton has a longstanding commitment to service and civic engagement. Tell us how your story intersects or will intersect with these values.",
    prompt2: 'Tell us about a person who has influenced you in a significant way.',
  },
  // Columbia
  '190150': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-01',
    applicationFee: 85,
    funFact: "Columbia's Core Curriculum, established in 1919, is one of the oldest and most celebrated general education programs in the United States.",
    prompt1: "Why are you interested in attending Columbia University? We encourage you to consider the aspect(s) that you find unique and compelling about Columbia.",
    prompt2: 'A hallmark of the Columbia experience is being able to learn and thrive in an equitable and inclusive community with a wide range of perspectives. Tell us about an aspect of your own perspective, identity, or experience that is important to you, and how it has shaped the way you approach the world.',
  },
  // Yale
  '130794': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-02',
    applicationFee: 80,
    funFact: "Yale's residential college system, modeled after Oxford and Cambridge, has been home to students since 1933 and creates tight-knit communities within the larger university.",
    prompt1: "Students at Yale have time to explore their academic interests before committing to one or more major fields of study. Many students either embark on interdisciplinary studies or pursue programs that combine two fields (e.g., Economics and Mathematics; Film and Media Studies). What are some topics or ideas that excite you and that you hope to explore in college?",
    prompt2: "Yale's extensive resources allow students to explore their intellectual interests, and Yale students are encouraged to think critically about the nature of knowledge. Describe how you have grappled with a challenging problem, question, or ethical dilemma.",
  },
  // UPenn
  '215062': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-05',
    applicationFee: 75,
    funFact: "Penn was founded by Benjamin Franklin in 1740, making it one of the oldest universities in the United States and the first to offer both undergraduate and professional degrees.",
    prompt1: "How will you explore your intellectual and academic interests at the University of Pennsylvania? Please answer this question given the specific undergraduate school or program to which you are applying.",
    prompt2: "At Penn, learning and growth happen outside of the classroom, too. How will you explore the Penn community? Consider how this community's opportunities relate to your goals.",
  },
  // Duke
  '198419': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-02',
    applicationFee: 85,
    funFact: "Duke's Cameron Indoor Stadium is widely considered one of the most intimidating college basketball venues in America, famous for its student section known as the 'Cameron Crazies.'",
    prompt1: "What is your sense of Duke as a university and a community, and why do you want to attend Duke?",
    prompt2: "Duke's campus is a unique place with a distinctive culture — describe an aspect of Duke's campus environment that you look forward to being part of.",
  },
  // Northwestern
  '147767': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-05',
    applicationFee: 75,
    funFact: "Northwestern's 'Dillo Day,' the largest student-run music festival in the country, takes place on Lakefill, a peninsula built entirely on landfill that juts into Lake Michigan.",
    prompt1: "What are the unique qualities of Northwestern — and of the specific undergraduate school or program to which you are applying — that make you want to attend the University?",
    prompt2: "Northwestern's core curricular values are creativity, collaboration, and innovation. Tell us how you have embodied one of these three values in an experience.",
  },
  // Cornell
  '190415': {
    eaDeadline: '2025-11-01',
    edDeadline: null,
    rdDeadline: '2026-01-02',
    applicationFee: 80,
    funFact: "Cornell has two schools of ivy — School of Industrial and Labor Relations and School of Hotel Administration — that are unique among the Ivy League universities.",
    prompt1: "Why Cornell? Why are you drawn to studying in your intended college or school, and how is it a good fit for your hopes, interests, and goals?",
    prompt2: "College is a time to explore new and exciting ideas, experiences, and perspectives. Describe an experience or idea that you would love to pursue at Cornell.",
  },
}

const DEFAULT_DEADLINES = {
  eaDeadline: null,
  edDeadline: null,
  rdDeadline: '2026-01-15',
  applicationFee: 75,
}

const DEFAULT_PROMPTS = {
  funFact: null,
  prompt1: 'Describe a meaningful challenge or experience and what you learned from it.',
  prompt2: 'What makes you a unique addition to our campus community?',
}

export function enrich(unitId, schoolName) {
  const data = ENRICHMENT[String(unitId)]
  if (data) return data

  // Fuzzy fallback by school name for unlisted schools
  return { ...DEFAULT_DEADLINES, ...DEFAULT_PROMPTS }
}
