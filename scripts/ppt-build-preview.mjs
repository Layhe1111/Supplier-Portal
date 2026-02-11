#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';

const INPUT_PATH = process.argv[2] || 'tmp/ppt-latest-request.json';
const OUTPUT_DIR = process.argv[3] || 'tmp';
const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || '';

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isPrimitive = (v) =>
  v == null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
const toText = (v) => (v == null ? '' : String(v).trim());

const clone = (v) => JSON.parse(JSON.stringify(v));

const safeText = (v, fallback = '', max = 300) => {
  const t = toText(v).replace(/\s+/g, ' ').trim();
  if (!t) return fallback;
  return t.length > max ? `${t.slice(0, max - 1)}...` : t;
};

const getRootPayload = (input) => {
  if (isObject(input) && isObject(input.source_payload)) return input.source_payload;
  return input;
};

const flattenEntries = (scope) => {
  const out = [];
  const stack = [scope];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!isObject(node) && !Array.isArray(node)) continue;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i -= 1) stack.push(node[i]);
      continue;
    }
    for (const [k, v] of Object.entries(node)) {
      out.push([k, v]);
      if (isObject(v) || Array.isArray(v)) stack.push(v);
    }
  }
  return out;
};

const pickValue = (scope, patterns, fallback = '', max = 220) => {
  const regs = patterns.map((p) => (p instanceof RegExp ? p : new RegExp(p, 'i')));
  for (const [k, v] of flattenEntries(scope)) {
    if (!regs.some((r) => r.test(k))) continue;
    if (isPrimitive(v)) {
      const t = safeText(v, '', max);
      if (t) return t;
    } else if (Array.isArray(v)) {
      const primitiveItems = v
        .filter((item) => isPrimitive(item))
        .map((item) => safeText(item, '', 80))
        .filter(Boolean);
      if (primitiveItems.length > 0) return safeText(primitiveItems.join(', '), '', max);
    }
  }
  return fallback;
};

const pickArray = (scope, patterns) => {
  const regs = patterns.map((p) => (p instanceof RegExp ? p : new RegExp(p, 'i')));
  for (const [k, v] of flattenEntries(scope)) {
    if (regs.some((r) => r.test(k)) && Array.isArray(v)) return v;
  }
  return [];
};

const pickSection = (source, patterns) => {
  if (!isObject(source)) return source;
  const regs = patterns.map((p) => (p instanceof RegExp ? p : new RegExp(p, 'i')));
  for (const [k, v] of Object.entries(source)) {
    if (regs.some((r) => r.test(k))) return v;
  }
  return source;
};

const isHttpUrl = (value) => /^https?:\/\//i.test(value);
const isImageUrl = (value) => /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?|$)/i.test(value);

const collectImageUrls = (value, out = new Set()) => {
  if (typeof value === 'string' && isHttpUrl(value) && isImageUrl(value)) {
    out.add(value.trim());
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((item) => collectImageUrls(item, out));
    return out;
  }
  Object.values(value).forEach((item) => collectImageUrls(item, out));
  return out;
};

const takeImages = (value, max = 3) => Array.from(collectImageUrls(value)).slice(0, max);

const parseServiceItems = (businessDescription) => {
  const text = toText(businessDescription);
  const candidates = [
    'Interior Design',
    'Design & Build',
    'Hospitality Design',
    'Architectural Design',
    'Sustainable Design',
    'Workspace Strategy',
  ];
  const found = candidates.filter((s) => new RegExp(s.replace(/[&]/g, '\\&'), 'i').test(text));
  return found.length > 0 ? found : ['Service scope based on submitted company profile.'];
};

const collectProjectCards = (source) => {
  const rows = [];
  const projectArrays = [];
  projectArrays.push(
    ...pickArray(source, [/design highlights/i, /project highlights/i, /经典案例/i, /亮點項目/i]),
    ...pickArray(source, [/projects \/ 項目經歷/i, /projects/i])
  );
  for (const item of projectArrays) {
    if (!isObject(item)) continue;
    const name = pickValue(item, [/project name/i, /項目名稱/i], '', 120);
    const year = pickValue(item, [/year/i, /年份/i], '', 40);
    const area = pickValue(item, [/area/i, /面積|面积/i], '', 60);
    const type = pickValue(item, [/property types/i, /項目類型|项目类型/i], '', 120);
    if (!name) continue;
    rows.push({
      name,
      year: year || 'N/A',
      area: area || 'N/A',
      type: type || 'N/A',
      photos: takeImages(item, 3),
    });
  }

  const dedup = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.name)) continue;
    dedup.push(row);
    seen.add(row.name);
    if (dedup.length >= 3) break;
  }
  return dedup;
};

const collectAwards = (source) => {
  const arr = pickArray(source, [/design awards/i, /awards?/i, /獎項|奖项/i]);
  const items = [];
  for (const row of arr) {
    if (!isObject(row)) continue;
    const year = pickValue(row, [/year/i, /年份/i], 'N/A', 30);
    const award = pickValue(row, [/award/i, /獎項|奖项/i], 'N/A', 120);
    const placement = pickValue(row, [/placement/i, /名次/i], 'N/A', 40);
    const project = pickValue(row, [/project/i, /項目|项目/i], 'N/A', 120);
    items.push({
      key: `${year} - ${award}`,
      value: `Placement: ${placement}; Project: ${project}`,
    });
    if (items.length >= 4) break;
  }
  return items;
};

const collectTeamFacts = (source) => {
  const personnel = pickArray(source, [/design personnel/i, /project managers/i, /設計人員|项目经理/i]);
  const rows = [];
  for (const person of personnel) {
    if (!isObject(person)) continue;
    const name = pickValue(person, [/designer name/i, /^name\b/i, /姓名|設計師姓名/i], '', 120);
    if (!name) continue;
    const exp = pickValue(person, [/years? of experience/i, /year of experience/i, /年資|年资/i], 'N/A', 30);
    rows.push({ key: name, value: `${exp} years experience` });
    if (rows.length >= 4) break;
  }
  return rows;
};

const normalizeList = (value, max = 5) =>
  toText(value)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
    .join(', ');

const buildPrePayload = (source) => {
  const overview = pickSection(source, [/company overview/i, /設計公司概況|公司概览|公司概況/i]);
  const specialization = pickSection(source, [/design specialization/i, /設計專業|设计专长/i]);
  const personnel = pickSection(source, [/personnel/i, /人員|人员/i]);
  const db = pickSection(source, [/design\s*&\s*build|d&b/i, /施工能力|能力/i]);
  const compliance = pickSection(source, [/compliance|governance/i, /合規|合规/i]);
  const contact = pickSection(source, [/contact/i, /聯絡人資料|联系方式/i]);

  const companyName = pickValue(
    overview,
    [/company english name/i, /company name/i, /公司英文名|公司名称|公司名稱/i],
    'Design Firm',
    120
  );
  const foundedYear = pickValue(overview, [/year of incorporation/i, /成立年份/i], 'N/A', 40);
  const capital = pickValue(overview, [/registered capital/i, /註冊資本|注册资本/i], 'N/A', 100);
  const country = pickValue(overview, [/\bcountry\b/i, /國家和地區|国家和地区/i], 'N/A', 120);
  const address = pickValue(overview, [/office address/i, /辦公地址|办公地址/i], 'N/A', 200);
  const businessDescription = pickValue(
    overview,
    [/business description/i, /公司或業務簡介|公司或业务简介/i],
    'Business profile provided by supplier.',
    520
  );
  const teamSize = pickValue(source, [/design team size/i, /團隊規模|团队规模/i], 'N/A', 60);
  const website = pickValue(source, [/company website/i, /公司網站|公司网站/i], '', 200);

  const serviceItems = parseServiceItems(businessDescription);
  const propertyTypes = normalizeList(
    pickValue(specialization, [/property types/i, /項目類型|项目类型/i], 'N/A', 220)
  );
  const styles = normalizeList(
    pickValue(specialization, [/design styles/i, /擅長風格|擅长风格/i], 'N/A', 220)
  );
  const software = normalizeList(
    pickValue(specialization, [/main software/i, /主要軟件|主要软件/i], 'N/A', 220)
  );
  const bim = pickValue(specialization, [/bim/i], 'N/A', 40);

  const projects = collectProjectCards(source);
  const awards = collectAwards(source);
  const teamFacts = collectTeamFacts(source);

  const designBuild = pickValue(
    db,
    [/provide design\s*&\s*build/i, /是否能提供d&b服務|是否能提供d&b服务/i],
    'N/A',
    80
  );
  const annualArea = pickValue(
    db,
    [/accumulated project area per year/i, /年施工面積|年施工面积/i],
    'N/A',
    80
  );
  const parallel = pickValue(
    db,
    [/maximum number of projects in parallel/i, /最多能同時承接的項目數|并行承接/i],
    'N/A',
    80
  );
  const avgValue = pickValue(
    db,
    [/average project value/i, /平均項目金額|平均项目金额/i],
    'N/A',
    100
  );

  const safetyOfficer = pickValue(
    source,
    [/number of safety officers/i, /安全主任人數|安全主任人数/i],
    'N/A',
    60
  );
  const incidents = pickValue(
    source,
    [/incidents in the past 3 years/i, /過去3年是否有任何事故|过去3年是否有任何事故/i],
    'N/A',
    60
  );
  const litigation = pickValue(
    source,
    [/litigation in the past 3 years/i, /過去3年是否有任何訴訟|过去3年是否有任何诉讼/i],
    'N/A',
    60
  );

  const insuranceRows = pickArray(source, [/insurance/i, /保險|保险/i]);
  let insuranceText = 'N/A';
  if (insuranceRows.length > 0 && isObject(insuranceRows[0])) {
    const row = insuranceRows[0];
    insuranceText = safeText(
      `${pickValue(row, [/insurance type/i, /保險類型|保险类型/i], 'N/A', 80)} | ${pickValue(row, [/insurance provider/i, /保險公司|保险公司/i], 'N/A', 80)} | Expiry: ${pickValue(row, [/expiry date/i, /到期日期/i], 'N/A', 40)}`,
      'N/A',
      220
    );
  }

  const contactName = pickValue(contact, [/contact person/i, /聯絡人|联系人/i], 'Business Team', 120);
  const contactTitle = pickValue(contact, [/position/i, /職位|职位/i], 'N/A', 120);
  const contactPhone = pickValue(contact, [/contact number/i, /聯繫電話|联系电话/i], 'N/A', 120);
  const contactEmail = pickValue(contact, [/email/i, /電郵|邮箱/i], 'N/A', 160);
  const contactFax = pickValue(contact, [/fax/i, /傳真|传真/i], 'N/A', 120);

  const companyImages = takeImages(overview, 3);
  const projectImages = projects.flatMap((p) => p.photos).slice(0, 3);
  const teamImages = takeImages(personnel, 2);
  const dbImages = takeImages(db, 2);

  const selectedProjectKv = [];
  projects.forEach((p, idx) => {
    selectedProjectKv.push({
      key: `Project ${idx + 1}: ${p.name}`,
      value: `Year: ${p.year}; Area: ${p.area}; Type: ${p.type}`,
    });
  });
  if (selectedProjectKv.length === 0) {
    selectedProjectKv.push({
      key: 'Project Summary',
      value: 'No project highlights were found in the submitted data.',
    });
  }

  const awardKv =
    awards.length > 0
      ? awards
      : [{ key: 'Awards', value: 'No award records were found in the submitted data.' }];

  const teamKv = [];
  teamKv.push({ key: 'Primary Contact', value: contactName });
  teamKv.push({ key: 'Role', value: contactTitle });
  teamKv.push({ key: 'Design Team Size', value: teamSize });
  for (const row of teamFacts.slice(0, 3)) teamKv.push(row);

  return {
    text:
      'Generate an English-only professional PPT with the fixed outline. Keep a clean and minimal visual style. Use only supplier-provided image URLs.',
    complex: 2,
    font_name: '黑体',
    language: 'en-US',
    transition: '1',
    color: '蓝色',
    user_name: contactName,
    ai_picture: false,
    report: false,
    custom_data: {
      title: `${companyName} - Design Firm Brochure Deck`,
      sub_title: 'Company Profile & Capability Overview',
      author: contactName,
      catalogs: [
        { catalog: 'Company Overview', sub_catalog: ['Company Background, Timeline, Positioning & Scale'] },
        { catalog: 'Our Services', sub_catalog: ['Integrated Design + Design & Build Service Scope'] },
        { catalog: 'Design Expertise', sub_catalog: ['Project Types, Design Styles & Technical Capability'] },
        { catalog: 'Regional Experience & Clients', sub_catalog: ['Regional Footprint and Representative Clients'] },
        { catalog: 'Selected Projects', sub_catalog: ['Featured Project References'] },
        { catalog: 'Awards & Recognition', sub_catalog: ['International Awards and Industry Recognition'] },
        { catalog: 'Team & Leadership', sub_catalog: ['Core Design and Project Leadership Team'] },
        { catalog: 'Design & Build Capability', sub_catalog: ['Project Scale, Delivery Capability, Parallel Capacity'] },
        { catalog: 'Compliance & Quality', sub_catalog: ['Safety, Insurance, Quality and Compliance Commitments'] },
        { catalog: 'Contact', sub_catalog: ['Primary Contact and Company Address'] },
      ],
      contents: [
        {
          catalog_index: 0,
          sub_catalog_index: 0,
          content: [
            { key: 'Company Name', value: companyName },
            { key: 'Established', value: foundedYear },
            { key: 'Registered Capital', value: capital },
            { key: 'Regional Positioning', value: country },
            { key: 'Team Scale', value: teamSize },
            { key: 'Office Address', value: address },
          ],
          ...(companyImages.length > 0 ? { picture: companyImages } : {}),
        },
        {
          catalog_index: 1,
          sub_catalog_index: 0,
          content: [
            `Core service scope: ${serviceItems.join(', ')}.`,
            `Delivery model status: Design & Build capability is marked as ${designBuild}.`,
            'The service narrative is strictly based on submitted company description and service fields.',
          ],
        },
        {
          catalog_index: 2,
          sub_catalog_index: 0,
          content: [
            { key: 'Project Types', value: propertyTypes || 'N/A' },
            { key: 'Design Styles', value: styles || 'N/A' },
            { key: 'Main Software', value: software || 'N/A' },
            { key: 'BIM Capability', value: bim || 'N/A' },
          ],
        },
        {
          catalog_index: 3,
          sub_catalog_index: 0,
          content: [
            `Regional base: ${country}.`,
            `Representative projects include: ${projects.map((p) => p.name).join(', ') || 'N/A'}.`,
            `Website: ${website || 'N/A'}.`,
          ],
        },
        {
          catalog_index: 4,
          sub_catalog_index: 0,
          content: selectedProjectKv,
          ...(projectImages.length > 0 ? { picture: projectImages } : {}),
        },
        {
          catalog_index: 5,
          sub_catalog_index: 0,
          content: awardKv,
        },
        {
          catalog_index: 6,
          sub_catalog_index: 0,
          content: teamKv,
          ...(teamImages.length > 0 ? { picture: teamImages } : {}),
        },
        {
          catalog_index: 7,
          sub_catalog_index: 0,
          content: [
            { key: 'Design & Build Service', value: designBuild },
            { key: 'Annual Delivered Area (sqft)', value: annualArea },
            { key: 'Parallel Project Capacity', value: parallel },
            { key: 'Average Project Value (HKD)', value: avgValue },
          ],
          ...(dbImages.length > 0 ? { picture: dbImages } : {}),
        },
        {
          catalog_index: 8,
          sub_catalog_index: 0,
          content: [
            `Safety staffing: ${safetyOfficer} safety officer(s) reported.`,
            `Insurance snapshot: ${insuranceText}.`,
            `Past 3-year incident status: ${incidents}; litigation status: ${litigation}.`,
          ],
        },
        {
          catalog_index: 9,
          sub_catalog_index: 0,
          content: [
            { key: 'Contact Person', value: contactName },
            { key: 'Position', value: contactTitle },
            { key: 'Phone', value: contactPhone },
            { key: 'Email', value: contactEmail },
            { key: 'Fax', value: contactFax },
            { key: 'Address', value: address },
            ...(website ? [{ key: 'Website', value: website }] : []),
          ],
        },
      ],
    },
    meta: {
      source_summary: {
        business_description: businessDescription,
      },
    },
  };
};

const stripCodeFence = (value) =>
  value
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

const rewriteWithDeepSeek = async (source, prePayload) => {
  if (!DEEPSEEK_API_KEY) return clone(prePayload);
  const post = clone(prePayload);
  const contents = post?.custom_data?.contents;
  if (!Array.isArray(contents)) return post;

  const textSlides = contents
    .filter((slide) => Array.isArray(slide?.content))
    .map((slide) => ({
      catalog_index: slide.catalog_index,
      sub_catalog_index: slide.sub_catalog_index,
      content: slide.content,
      is_text_slide: slide.content.every((c) => typeof c === 'string'),
    }))
    .filter((slide) => slide.is_text_slide)
    .map((slide) => ({
      catalog_index: slide.catalog_index,
      sub_catalog_index: slide.sub_catalog_index,
      content: slide.content,
    }));
  if (textSlides.length === 0) return post;

  const prompt = {
    task: 'Rewrite only text slides into concise, business-grade English. Keep facts unchanged.',
    constraints: [
      'Return JSON only: {"contents":[{catalog_index,sub_catalog_index,content}]}',
      'Do not add new facts, names, years, numbers, addresses, email, phone, or claims.',
      'Keep each content as array of strings, 3-5 bullets, each bullet under 140 chars.',
      'Keep catalog_index and sub_catalog_index unchanged.',
    ],
    text_slides: textSlides,
    source_reference: source,
  };

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a senior corporate presentation editor.',
        },
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
    }),
  });
  if (!res.ok) return post;

  const data = await res.json().catch(() => null);
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || !raw.trim()) return post;

  let parsed = null;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return post;
  }

  const rewritten = Array.isArray(parsed?.contents) ? parsed.contents : [];
  if (rewritten.length === 0) return post;

  const map = new Map();
  rewritten.forEach((slide) => {
    const ci = typeof slide?.catalog_index === 'number' ? slide.catalog_index : -1;
    const si = typeof slide?.sub_catalog_index === 'number' ? slide.sub_catalog_index : -1;
    if (ci < 0 || si < 0 || !Array.isArray(slide?.content)) return;
    const cleanLines = slide.content
      .filter((x) => typeof x === 'string')
      .map((x) => safeText(x, '', 150))
      .filter(Boolean)
      .slice(0, 5);
    if (cleanLines.length === 0) return;
    map.set(`${ci}-${si}`, cleanLines);
  });

  post.custom_data.contents = post.custom_data.contents.map((slide) => {
    if (!Array.isArray(slide?.content)) return slide;
    if (!slide.content.every((c) => typeof c === 'string')) return slide;
    const key = `${slide.catalog_index}-${slide.sub_catalog_index}`;
    const next = map.get(key);
    if (!next) return slide;
    return {
      ...slide,
      content: next,
    };
  });

  return post;
};

const buildFactMap = (payload) => {
  const map = new Map();
  const contents = payload?.custom_data?.contents;
  if (!Array.isArray(contents)) return map;
  for (const section of contents) {
    const ci = typeof section?.catalog_index === 'number' ? section.catalog_index : -1;
    const si = typeof section?.sub_catalog_index === 'number' ? section.sub_catalog_index : -1;
    if (!Array.isArray(section?.content)) continue;
    for (const item of section.content) {
      if (!isObject(item)) continue;
      const k = safeText(item.key, '', 100);
      const v = safeText(item.value, '', 300);
      if (!k || !v) continue;
      map.set(`${ci}|${si}|${k}`, v);
    }
  }
  return map;
};

const validateConsistency = (before, after) => {
  const b = buildFactMap(before);
  const a = buildFactMap(after);
  const mismatches = [];
  for (const [k, v] of b.entries()) {
    if (!a.has(k)) {
      mismatches.push(`Missing fact key after rewrite: ${k}`);
      continue;
    }
    if (a.get(k) !== v) {
      mismatches.push(`Fact changed: ${k} | "${v}" => "${a.get(k)}"`);
    }
  }
  return {
    ok: mismatches.length === 0,
    mismatch_count: mismatches.length,
    mismatches,
    before_fact_count: b.size,
    after_fact_count: a.size,
  };
};

const run = async () => {
  const inFile = resolve(process.cwd(), INPUT_PATH);
  const outDir = resolve(process.cwd(), OUTPUT_DIR);

  const raw = await readFile(inFile, 'utf8');
  const parsed = JSON.parse(raw);
  const source = getRootPayload(parsed);

  const pre = buildPrePayload(source);
  const post = await rewriteWithDeepSeek(source, pre);
  const consistency = validateConsistency(pre, post);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'ppt-pre-rewrite.json'), JSON.stringify(pre, null, 2), 'utf8');
  await writeFile(join(outDir, 'ppt-post-rewrite.json'), JSON.stringify(post, null, 2), 'utf8');
  await writeFile(
    join(outDir, 'ppt-consistency-check.json'),
    JSON.stringify(consistency, null, 2),
    'utf8'
  );

  const summary = {
    output_files: {
      pre: join(outDir, 'ppt-pre-rewrite.json'),
      post: join(outDir, 'ppt-post-rewrite.json'),
      consistency: join(outDir, 'ppt-consistency-check.json'),
    },
    company_title: post?.custom_data?.title || pre?.custom_data?.title || '',
    fact_consistency_ok: consistency.ok,
    mismatch_count: consistency.mismatch_count,
  };
  console.log(JSON.stringify(summary, null, 2));
};

run().catch((err) => {
  console.error('Failed to build preview payload:', err?.message || err);
  process.exitCode = 1;
});
