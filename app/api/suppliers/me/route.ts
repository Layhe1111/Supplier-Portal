import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const requireUser = async (request: Request) => {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return { error: NextResponse.json({ error: 'Invalid auth token' }, { status: 401 }) };
  }

  return { user: data.user };
};

const getUserRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return 'user';
  return data?.role || 'user';
};

const toNumberString = (value: number | null) =>
  value == null || Number.isNaN(value) ? '' : String(value);

const toText = (value: unknown) => (typeof value === 'string' ? value : '');

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const toYesNo = (value: boolean | null) => {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
};

const toDateString = (value: unknown) => (typeof value === 'string' ? value : '');

const splitFax = (value: unknown) => {
  if (typeof value !== 'string') {
    return { code: '+852', number: '' };
  }
  const trimmed = value.trim();
  if (!trimmed) return { code: '+852', number: '' };
  const match = trimmed.match(/^(\+\d+)\s*(.*)$/);
  if (match) {
    return { code: match[1], number: match[2].trim() };
  }
  return { code: '+852', number: trimmed };
};

export async function GET(request: Request) {
  try {
    const auth = await requireUser(request);
    if ('error' in auth) return auth.error;

    const url = new URL(request.url);
    const typeParam = url.searchParams.get('type');
    const userIdParam = url.searchParams.get('userId');
    let targetUserId = auth.user.id;

    if (userIdParam && userIdParam !== auth.user.id) {
      const role = await getUserRole(auth.user.id);
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetUserId = userIdParam;
    }

    let supplierQuery = supabaseAdmin
      .from('suppliers')
      .select('id, supplier_type, status, submitted_at, updated_at')
      .eq('user_id', targetUserId);

    if (typeParam) {
      supplierQuery = supplierQuery.eq('supplier_type', typeParam);
    } else {
      supplierQuery = supplierQuery.order('updated_at', { ascending: false }).limit(1);
    }

    const supplierResult = await supplierQuery.maybeSingle();
    if (supplierResult.error) {
      return NextResponse.json(
        { error: supplierResult.error.message },
        { status: 500 }
      );
    }

    if (!supplierResult.data) {
      return NextResponse.json({ supplier: null, status: null });
    }

    const supplierId = supplierResult.data.id as string;
    const supplierType = supplierResult.data.supplier_type as string;
    const supplierStatus = (supplierResult.data.status || null) as string | null;

    const [
      companyResult,
      registrationResult,
      contactResult,
      commitmentsResult,
      documentsResult,
      projectTypesResult,
      projectHighlightsResult,
      projectManagersResult,
      certificationsResult,
      insurancesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('supplier_company')
        .select(
          'company_name_en, company_name_zh, year_established, registered_capital, country, office_address, hk_work_eligible_employees, business_type, business_description, company_supplement_link, company_logo_path'
        )
        .eq('supplier_id', supplierId)
        .maybeSingle(),
      supabaseAdmin
        .from('supplier_registration')
        .select('hk_business_registration_number, cn_business_registration_number, cn_unified_social_credit_code')
        .eq('supplier_id', supplierId)
        .maybeSingle(),
      supabaseAdmin
        .from('supplier_contact')
        .select(
          'contact_name, contact_position, contact_phone_code, contact_phone, contact_email, contact_fax, submission_date'
        )
        .eq('supplier_id', supplierId)
        .maybeSingle(),
      supabaseAdmin
        .from('supplier_commitments')
        .select('guarantee_info_true, accept_quality_supervision, agree_info_sharing')
        .eq('supplier_id', supplierId)
        .maybeSingle(),
      supabaseAdmin
        .from('supplier_documents')
        .select('scope, doc_type, path, metadata, created_at')
        .eq('supplier_id', supplierId),
      supabaseAdmin
        .from('supplier_project_types')
        .select('scope, project_type, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('project_highlights')
        .select('id, scope, project_name, year, address, area, renovation_type, project_types, is_highlight, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('project_managers')
        .select('id, scope, name, years_experience, languages, main_project, year, address, area, cv_path, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('supplier_certifications')
        .select('id, scope, cert_type, iso_code, name, file_path, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('supplier_insurances')
        .select('id, scope, insurance_type, provider, expiry_date, file_path, created_at')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: true }),
    ]);

    const firstError = [
      companyResult.error,
      registrationResult.error,
      contactResult.error,
      commitmentsResult.error,
      documentsResult.error,
      projectTypesResult.error,
      projectHighlightsResult.error,
      projectManagersResult.error,
      certificationsResult.error,
      insurancesResult.error,
    ].find((error) => error);

    if (firstError) {
      return NextResponse.json(
        { error: (firstError as { message?: string }).message || 'Failed to load data' },
        { status: 500 }
      );
    }

    const documents = documentsResult.data || [];
    const docMap = new Map<string, any[]>();
    documents.forEach((doc: any) => {
      const scope = doc.scope || '';
      const key = `${scope}:${doc.doc_type}`;
      const list = docMap.get(key) || [];
      list.push(doc);
      docMap.set(key, list);
    });

    const sortDocs = (docs: any[]) =>
      docs.slice().sort((a, b) => {
        const aIndex = typeof a.metadata?.index === 'number' ? a.metadata.index : null;
        const bIndex = typeof b.metadata?.index === 'number' ? b.metadata.index : null;
        if (aIndex != null || bIndex != null) {
          return (aIndex ?? 0) - (bIndex ?? 0);
        }
        const aTime = a.created_at ? Date.parse(a.created_at) : 0;
        const bTime = b.created_at ? Date.parse(b.created_at) : 0;
        return aTime - bTime;
      });

    const getDocList = (scope: string, docType: string) => {
      const key = `${scope}:${docType}`;
      const list = docMap.get(key) || [];
      return sortDocs(list).map((doc) => doc.path);
    };

    const getDocSingle = (scope: string, docType: string) => {
      const list = getDocList(scope, docType);
      return list.length > 0 ? list[0] : null;
    };

    const projectHighlights = projectHighlightsResult.data || [];
    const projectHighlightIds = projectHighlights.map((row: any) => row.id);
    const projectFilesMap = new Map<string, string[]>();

    if (projectHighlightIds.length > 0) {
      const projectFilesResult = await supabaseAdmin
        .from('project_files')
        .select('project_id, path')
        .in('project_id', projectHighlightIds);

      if (projectFilesResult.error) {
        return NextResponse.json(
          { error: projectFilesResult.error.message },
          { status: 500 }
        );
      }

      (projectFilesResult.data || []).forEach((file: any) => {
        const list = projectFilesMap.get(file.project_id) || [];
        list.push(file.path);
        projectFilesMap.set(file.project_id, list);
      });
    }

    const highlightsByScope = new Map<string, any[]>();
    projectHighlights.forEach((row: any) => {
      const list = highlightsByScope.get(row.scope) || [];
      list.push(row);
      highlightsByScope.set(row.scope, list);
    });

    const projectManagers = projectManagersResult.data || [];
    const projectManagerIds = projectManagers.map((row: any) => row.id);
    const managerProjectsMap = new Map<string, any[]>();

    if (projectManagerIds.length > 0) {
      const managerProjectsResult = await supabaseAdmin
        .from('project_manager_projects')
        .select('id, project_manager_id, project_name, client_name, year, building_name, area, created_at')
        .in('project_manager_id', projectManagerIds)
        .order('created_at', { ascending: true });

      if (managerProjectsResult.error) {
        return NextResponse.json(
          { error: managerProjectsResult.error.message },
          { status: 500 }
        );
      }

      (managerProjectsResult.data || []).forEach((project: any) => {
        const list = managerProjectsMap.get(project.project_manager_id) || [];
        list.push(project);
        managerProjectsMap.set(project.project_manager_id, list);
      });
    }

    const managersByScope = new Map<string, any[]>();
    projectManagers.forEach((row: any) => {
      const list = managersByScope.get(row.scope) || [];
      list.push(row);
      managersByScope.set(row.scope, list);
    });

    const projectTypesByScope = new Map<string, string[]>();
    (projectTypesResult.data || []).forEach((row: any) => {
      if (!row.project_type) return;
      const list = projectTypesByScope.get(row.scope) || [];
      list.push(row.project_type);
      projectTypesByScope.set(row.scope, list);
    });

    const certificationsByScope = new Map<string, any[]>();
    (certificationsResult.data || []).forEach((row: any) => {
      const list = certificationsByScope.get(row.scope) || [];
      list.push(row);
      certificationsByScope.set(row.scope, list);
    });

    const insurancesByScope = new Map<string, any[]>();
    (insurancesResult.data || []).forEach((row: any) => {
      const list = insurancesByScope.get(row.scope) || [];
      list.push(row);
      insurancesByScope.set(row.scope, list);
    });

    const mapProjectHighlights = (rows: any[]) =>
      rows.map((row) => ({
        id: row.id,
        projectName: row.project_name ?? '',
        year: row.year ?? '',
        address: row.address ?? '',
        area: row.area ?? '',
        renovationType: row.renovation_type ?? '',
        projectTypes: toStringArray(row.project_types),
        projectHighlight: Boolean(row.is_highlight),
        photos: projectFilesMap.get(row.id) || [],
      }));

    const mapProjectManagers = (rows: any[]) =>
      rows.map((row) => ({
        id: row.id,
        name: row.name ?? '',
        yearsExperience: row.years_experience ?? '',
        languages: row.languages ?? '',
        mainProject: row.main_project ?? '',
        year: row.year ?? '',
        address: row.address ?? '',
        area: row.area ?? '',
        projects: (managerProjectsMap.get(row.id) || []).map((project: any) => ({
          id: project.id,
          projectName: project.project_name ?? '',
          clientName: project.client_name ?? '',
          year: project.year ?? '',
          buildingName: project.building_name ?? '',
          area: project.area ?? '',
        })),
        cv: row.cv_path ?? null,
      }));

    const mapCertifications = (scope: string) => {
      const rows = certificationsByScope.get(scope) || [];
      const isoCodes: string[] = [];
      const isoUploads: Record<string, string | null> = {};
      const otherCerts = rows
        .filter((row) => row.cert_type === 'other' && row.name)
        .map((row) => ({
          id: row.id,
          name: row.name ?? '',
          file: row.file_path ?? null,
        }));

      rows.forEach((row) => {
        if (row.cert_type !== 'iso' || !row.iso_code) return;
        isoCodes.push(row.iso_code);
        isoUploads[row.iso_code] = row.file_path ?? null;
      });

      return { isoCodes, isoUploads, otherCerts };
    };

    const mapInsurances = (scope: string) =>
      (insurancesByScope.get(scope) || []).map((row) => ({
        id: row.id,
        type: row.insurance_type ?? '',
        provider: row.provider ?? '',
        expiryDate: toDateString(row.expiry_date),
        file: row.file_path ?? null,
      }));

    const company = (companyResult.data || {}) as Record<string, any>;
    const registration = (registrationResult.data || {}) as Record<string, any>;
    const contact = (contactResult.data || {}) as Record<string, any>;
    const commitments = (commitmentsResult.data || {}) as Record<string, any>;

    const submissionDate =
      toDateString(contact.submission_date) || new Date().toISOString().split('T')[0];
    const fax = splitFax(contact.contact_fax);

    const baseCompanyName =
      toText(company.company_name_en) || toText(company.company_name_zh);

    const commonFields = (scope: string) => ({
      businessRegistration: getDocSingle(scope, 'business_registration'),
      companyPhotos: getDocSingle(scope, 'company_photos'),
      hkBusinessRegistrationNumber: toText(registration.hk_business_registration_number),
      cnBusinessRegistrationNumber: toText(registration.cn_business_registration_number),
      cnUnifiedSocialCreditCode: toText(registration.cn_unified_social_credit_code),
      guaranteeInfoTrue: Boolean(commitments.guarantee_info_true),
      acceptQualitySupervision: Boolean(commitments.accept_quality_supervision),
      agreeInfoSharing: Boolean(commitments.agree_info_sharing),
      submitterName: toText(contact.contact_name),
      submitterPosition: toText(contact.contact_position),
      submitterPhoneCode: toText(contact.contact_phone_code) || '+852',
      submitterPhone: toText(contact.contact_phone),
      submitterEmail: toText(contact.contact_email),
      contactFaxCode: fax.code,
      contactFax: fax.number,
      submissionDate,
    });

    if (supplierType === 'basic') {
      const supplier = {
        supplierType: 'basic',
        companyName: baseCompanyName,
        companyNameChinese: toText(company.company_name_zh),
        country: toText(company.country),
        officeAddress: toText(company.office_address),
        businessType: toText(company.business_type),
        submitterName: toText(contact.contact_name),
        submitterPosition: toText(contact.contact_position),
        submitterPhone: toText(contact.contact_phone),
        submitterPhoneCode: toText(contact.contact_phone_code) || '+852',
        submitterEmail: toText(contact.contact_email),
        contactFaxCode: fax.code,
        contactFax: fax.number,
        businessDescription: toText(company.business_description),
        companySupplementLink: toText(company.company_supplement_link),
        companyLogo: company.company_logo_path ?? null,
        submissionDate,
      };

      return NextResponse.json({ supplier, supplierId, status: supplierStatus });
    }

    if (supplierType === 'contractor') {
      const contractorResult = await supabaseAdmin
        .from('contractor_profile')
        .select(
          'number_of_employees, construction_grade, license_number, annual_construction_capacity, max_concurrent_projects, largest_project_value, has_safety_officer, safety_officer_count, has_construction_manager, construction_manager_count, has_mep_lead, mep_lead_count, cn_hk_project_compliance, has_environmental_health_safety, has_incidents_past_3_years, has_litigation_past_3_years'
        )
        .eq('supplier_id', supplierId)
        .maybeSingle();

      if (contractorResult.error) {
        return NextResponse.json(
          { error: contractorResult.error.message },
          { status: 500 }
        );
      }

      const contractorProfile = (contractorResult.data || {}) as Record<string, any>;
      const { isoCodes, isoUploads, otherCerts } = mapCertifications('contractor');
      const insurances = mapInsurances('contractor');
      const supplementFiles = getDocList('contractor', 'company_brochure');

      const supplier = {
        supplierType: 'contractor',
        companyName: baseCompanyName,
        companyNameChinese: toText(company.company_name_zh),
        yearEstablished: toText(company.year_established),
        registeredCapital: toText(company.registered_capital),
        numberOfEmployees: toText(contractorProfile.number_of_employees),
        country: toText(company.country),
        officeAddress: toText(company.office_address),
        businessDescription: toText(company.business_description),
        hkWorkEligibleEmployees: toText(company.hk_work_eligible_employees),
        companySupplementFile: supplementFiles.length > 0 ? supplementFiles : null,
        companySupplementLink: toText(company.company_supplement_link),
        constructionGrade: toText(contractorProfile.construction_grade),
        licenseNumber: toText(contractorProfile.license_number),
        certificateUpload: getDocSingle('contractor', 'certificate_upload'),
        isocertifications: isoCodes,
        isoCertificateUploads: isoUploads,
        otherCertifications: otherCerts,
        projectTypes: projectTypesByScope.get('contractor') || [],
        projectHighlights: mapProjectHighlights(highlightsByScope.get('contractor') || []),
        annualConstructionCapacity: toText(contractorProfile.annual_construction_capacity),
        maxConcurrentProjects: toText(contractorProfile.max_concurrent_projects),
        largestProjectValue: toText(contractorProfile.largest_project_value),
        projectManagers: mapProjectManagers(managersByScope.get('contractor') || []),
        organizationChart: getDocSingle('contractor', 'organization_chart'),
        hasSafetyOfficer: toYesNo(contractorProfile.has_safety_officer),
        numberOfSafetyOfficers: toNumberString(contractorProfile.safety_officer_count),
        hasConstructionManager: toYesNo(contractorProfile.has_construction_manager),
        numberOfConstructionManagers: toNumberString(contractorProfile.construction_manager_count),
        hasMepLead: toYesNo(contractorProfile.has_mep_lead),
        numberOfMepLeads: toNumberString(contractorProfile.mep_lead_count),
        cnHkProjectCompliance: Boolean(contractorProfile.cn_hk_project_compliance),
        insurances: insurances.length
          ? insurances
          : [
              {
                id: Date.now().toString(),
                type: '',
                provider: '',
                expiryDate: '',
                file: null,
              },
            ],
        hasEnvironmentalHealthSafety: toYesNo(contractorProfile.has_environmental_health_safety),
        environmentalHealthSafetyFile: getDocSingle('contractor', 'environmental_health_safety'),
        hasIncidentsPast3Years: toYesNo(contractorProfile.has_incidents_past_3_years),
        incidentsFile: getDocSingle('contractor', 'incident_report'),
        hasLitigationPast3Years: toYesNo(contractorProfile.has_litigation_past_3_years),
        litigationFile: getDocSingle('contractor', 'litigation_report'),
        ...commonFields('contractor'),
      };

      return NextResponse.json({ supplier, supplierId, status: supplierStatus });
    }

    if (supplierType === 'designer') {
      const [
        designerProfileResult,
        designerDbProfileResult,
        awardsResult,
        feeResult,
        stylesResult,
        softwareResult,
        designersResult,
      ] = await Promise.all([
        supabaseAdmin
          .from('designer_profile')
          .select('design_team_size, bim_capability, can_do_design_build')
          .eq('supplier_id', supplierId)
          .maybeSingle(),
        supabaseAdmin
          .from('designer_db_profile')
          .select(
            'construction_grade, license_number, annual_construction_capacity, max_concurrent_projects, largest_project_value, has_safety_officer, safety_officer_count, has_construction_manager, construction_manager_count, has_mep_lead, mep_lead_count, cn_hk_project_compliance, has_environmental_health_safety, has_incidents_past_3_years, has_litigation_past_3_years'
          )
          .eq('supplier_id', supplierId)
          .maybeSingle(),
        supabaseAdmin
          .from('designer_awards')
          .select('award, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('designer_fee_structures')
          .select('fee_type')
          .eq('supplier_id', supplierId),
        supabaseAdmin
          .from('designer_styles')
          .select('style')
          .eq('supplier_id', supplierId),
        supabaseAdmin
          .from('designer_software')
          .select('software')
          .eq('supplier_id', supplierId),
        supabaseAdmin
          .from('designers')
          .select('id, name, experience, cv_path, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: true }),
      ]);

      const designerFirstError = [
        designerProfileResult.error,
        designerDbProfileResult.error,
        awardsResult.error,
        feeResult.error,
        stylesResult.error,
        softwareResult.error,
        designersResult.error,
      ].find((error) => error);

      if (designerFirstError) {
        return NextResponse.json(
          { error: (designerFirstError as { message?: string }).message || 'Failed to load data' },
          { status: 500 }
        );
      }

      const designerProfile = (designerProfileResult.data || {}) as Record<string, any>;
      const designerDbProfile = (designerDbProfileResult.data || {}) as Record<string, any>;
      const awards = (awardsResult.data || []).map((row: any) => row.award).filter(Boolean);
      const feeStructures = (feeResult.data || []).map((row: any) => row.fee_type).filter(Boolean);
      const styles = (stylesResult.data || []).map((row: any) => row.style).filter(Boolean);
      const software = (softwareResult.data || []).map((row: any) => row.software).filter(Boolean);

      const designers = designersResult.data || [];
      const designerIds = designers.map((designer: any) => designer.id);

      let designerProjects: any[] = [];
      let designerProjectFiles: any[] = [];

      if (designerIds.length > 0) {
        const designerProjectsResult = await supabaseAdmin
          .from('designer_projects')
          .select('id, designer_id, project_name, year, address, area, renovation_type, project_types, is_highlight, created_at')
          .in('designer_id', designerIds)
          .order('created_at', { ascending: true });

        if (designerProjectsResult.error) {
          return NextResponse.json(
            { error: designerProjectsResult.error.message },
            { status: 500 }
          );
        }

        designerProjects = designerProjectsResult.data || [];
        const designerProjectIds = designerProjects.map((project: any) => project.id);

        if (designerProjectIds.length > 0) {
          const designerProjectFilesResult = await supabaseAdmin
            .from('designer_project_files')
            .select('designer_project_id, path')
            .in('designer_project_id', designerProjectIds);

          if (designerProjectFilesResult.error) {
            return NextResponse.json(
              { error: designerProjectFilesResult.error.message },
              { status: 500 }
            );
          }

          designerProjectFiles = designerProjectFilesResult.data || [];
        }
      }

      const designerProjectFilesMap = new Map<string, string[]>();
      designerProjectFiles.forEach((file: any) => {
        const list = designerProjectFilesMap.get(file.designer_project_id) || [];
        list.push(file.path);
        designerProjectFilesMap.set(file.designer_project_id, list);
      });

      const designerProjectsByDesigner = new Map<string, any[]>();
      designerProjects.forEach((project: any) => {
        const list = designerProjectsByDesigner.get(project.designer_id) || [];
        list.push(project);
        designerProjectsByDesigner.set(project.designer_id, list);
      });

      const designerList = designers.map((designer: any) => ({
        id: designer.id,
        name: designer.name ?? '',
        experience: designer.experience ?? '',
        languages: designer.languages ?? '',
        cv: designer.cv_path ?? null,
        projects: (designerProjectsByDesigner.get(designer.id) || []).map((project: any) => ({
          id: project.id,
          projectName: project.project_name ?? '',
          year: project.year ?? '',
          address: project.address ?? '',
          area: project.area ?? '',
          renovationType: project.renovation_type ?? '',
          projectTypes: toStringArray(project.project_types),
          projectHighlight: Boolean(project.is_highlight),
          photos: designerProjectFilesMap.get(project.id) || [],
        })),
      }));

      const { isoCodes: dbIsoCodes, isoUploads: dbIsoUploads, otherCerts: dbOtherCerts } =
        mapCertifications('designer_db');
      const dbInsurances = mapInsurances('designer_db');
      const dbSupplementFiles = getDocList('designer', 'company_brochure');

      const supplier = {
        supplierType: 'designer',
        companyName: baseCompanyName,
        companyNameChinese: toText(company.company_name_zh),
        yearEstablished: toText(company.year_established),
        registeredCapital: toText(company.registered_capital),
        country: toText(company.country),
        officeAddress: toText(company.office_address),
        businessDescription: toText(company.business_description),
        hkWorkEligibleEmployees: toText(company.hk_work_eligible_employees),
        designAwards: awards.length > 0 ? awards : [''],
        designTeamSize: toText(designerProfile.design_team_size),
        feeStructure: feeStructures,
        designHighlights: mapProjectHighlights(highlightsByScope.get('designer') || []),
        companySupplementFile: dbSupplementFiles.length > 0 ? dbSupplementFiles : null,
        companySupplementLink: toText(company.company_supplement_link),
        designStyles: styles,
        projectTypes: projectTypesByScope.get('designer') || [],
        bimCapability: toYesNo(designerProfile.bim_capability),
        mainSoftware: software.length > 0 ? software : [''],
        designers: designerList,
        organizationChart: getDocSingle('designer', 'organization_chart'),
        canDoDesignBuild: toYesNo(designerProfile.can_do_design_build),
        dbConstructionGrade: toText(designerDbProfile.construction_grade),
        dbLicenseNumber: toText(designerDbProfile.license_number),
        dbCertificateUpload: getDocSingle('designer_db', 'certificate_upload'),
        dbIsocertifications: dbIsoCodes,
        dbIsoCertificateUploads: dbIsoUploads,
        dbOtherCertifications: dbOtherCerts,
        dbProjectTypes: projectTypesByScope.get('designer_db') || [],
        dbProjectHighlights: mapProjectHighlights(highlightsByScope.get('designer_db') || []),
        dbAnnualConstructionCapacity: toText(designerDbProfile.annual_construction_capacity),
        dbMaxConcurrentProjects: toText(designerDbProfile.max_concurrent_projects),
        dbLargestProjectValue: toText(designerDbProfile.largest_project_value),
        dbProjectManagers: mapProjectManagers(managersByScope.get('designer_db') || []),
        dbOrganizationChart: getDocSingle('designer_db', 'organization_chart'),
        dbHasSafetyOfficer: toYesNo(designerDbProfile.has_safety_officer),
        dbNumberOfSafetyOfficers: toNumberString(designerDbProfile.safety_officer_count),
        dbHasConstructionManager: toYesNo(designerDbProfile.has_construction_manager),
        dbNumberOfConstructionManagers: toNumberString(designerDbProfile.construction_manager_count),
        dbHasMepLead: toYesNo(designerDbProfile.has_mep_lead),
        dbNumberOfMepLeads: toNumberString(designerDbProfile.mep_lead_count),
        dbCnHkProjectCompliance: Boolean(designerDbProfile.cn_hk_project_compliance),
        dbInsurances: dbInsurances.length
          ? dbInsurances
          : [
              {
                id: Date.now().toString(),
                type: '',
                provider: '',
                expiryDate: '',
                file: null,
              },
            ],
        dbHasEnvironmentalHealthSafety: toYesNo(designerDbProfile.has_environmental_health_safety),
        dbEnvironmentalHealthSafetyFile: getDocSingle('designer_db', 'environmental_health_safety'),
        dbHasIncidentsPast3Years: toYesNo(designerDbProfile.has_incidents_past_3_years),
        dbIncidentsFile: getDocSingle('designer_db', 'incident_report'),
        dbHasLitigationPast3Years: toYesNo(designerDbProfile.has_litigation_past_3_years),
        dbLitigationFile: getDocSingle('designer_db', 'litigation_report'),
        ...commonFields('designer'),
      };

      return NextResponse.json({ supplier, supplierId, status: supplierStatus });
    }

    if (supplierType === 'material') {
      const [
        materialProfileResult,
        companyTypesResult,
        brandsResult,
        warehousesResult,
      ] = await Promise.all([
        supabaseAdmin
          .from('material_profile')
          .select('sample_provided, sample_cost, sample_delivery_time, free_shipping_to_hk')
          .eq('supplier_id', supplierId)
          .maybeSingle(),
        supabaseAdmin
          .from('material_company_types')
          .select('company_type, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('material_represented_brands')
          .select('brand_name, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: true }),
        supabaseAdmin
          .from('material_warehouses')
          .select('address, capacity, created_at')
          .eq('supplier_id', supplierId)
          .order('created_at', { ascending: true }),
      ]);

      const materialFirstError = [
        materialProfileResult.error,
        companyTypesResult.error,
        brandsResult.error,
        warehousesResult.error,
      ].find((error) => error);

      if (materialFirstError) {
        return NextResponse.json(
          { error: (materialFirstError as { message?: string }).message || 'Failed to load data' },
          { status: 500 }
        );
      }

      const productsResult = await supabaseAdmin
        .from('products')
        .select(
          'id, sku, product_name, category, brand, series, spec, material, unit_price, moq, origin, lead_time_days, current_stock, specification_link'
        )
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (productsResult.error) {
        return NextResponse.json(
          { error: productsResult.error.message },
          { status: 500 }
        );
      }

      const productRows = productsResult.data || [];
      const productIds = productRows.map((row: any) => row.id).filter(Boolean);
      const productFileMap = new Map<string, { photos: string[]; spec: string | null; model3d: string | null }>();

      if (productIds.length > 0) {
        const productFilesResult = await supabaseAdmin
          .from('product_files')
          .select('product_id, file_type, path')
          .in('product_id', productIds);

        if (productFilesResult.error) {
          return NextResponse.json(
            { error: productFilesResult.error.message },
            { status: 500 }
          );
        }

        (productFilesResult.data || []).forEach((file: any) => {
          const entry = productFileMap.get(file.product_id) || {
            photos: [],
            spec: null,
            model3d: null,
          };
          if (file.file_type === 'photo') {
            entry.photos.push(file.path);
          } else if (file.file_type === 'spec') {
            entry.spec = file.path;
          } else if (file.file_type === 'model3d') {
            entry.model3d = file.path;
          }
          productFileMap.set(file.product_id, entry);
        });
      }

      const products = productRows.map((row: any) => {
        const files = productFileMap.get(row.id) || {
          photos: [],
          spec: null,
          model3d: null,
        };
        return {
          id: row.id,
          sku: row.sku ?? '',
          productName: row.product_name ?? '',
          category: row.category ?? '',
          brand: row.brand ?? '',
          series: row.series ?? '',
          spec: row.spec ?? '',
          material: row.material ?? '',
          unitPrice: toNumberString(row.unit_price),
          moq: toNumberString(row.moq),
          origin: row.origin ?? '',
          leadTime: toNumberString(row.lead_time_days),
          currentStock: toNumberString(row.current_stock),
          photos: files.photos,
          specificationFile: files.spec,
          specificationLink: row.specification_link ?? '',
          model3D: files.model3d,
        };
      });

      const materialProfile = (materialProfileResult.data || {}) as Record<string, any>;
      const companyTypes = (companyTypesResult.data || [])
        .map((row: any) => row.company_type)
        .filter(Boolean);
      const representedBrands = (brandsResult.data || [])
        .map((row: any) => row.brand_name)
        .filter(Boolean);
      const warehouses = (warehousesResult.data || [])
        .map((row: any) => ({
          address: row.address ?? '',
          capacity: row.capacity ?? '',
        }))
        .filter((row: any) => row.address || row.capacity);

      const supplementFiles = getDocList('material', 'company_brochure');

      const supplier = {
        supplierType: 'material',
        companyName: baseCompanyName,
        companyNameChinese: toText(company.company_name_zh),
        yearEstablished: toText(company.year_established),
        registeredCapital: toText(company.registered_capital),
        country: toText(company.country),
        officeAddress: toText(company.office_address),
        businessDescription: toText(company.business_description),
        hkWorkEligibleEmployees: toText(company.hk_work_eligible_employees),
        companyType: companyTypes,
        representedBrands: representedBrands.length > 0 ? representedBrands : [''],
        warehouses: warehouses.length > 0 ? warehouses : [{ address: '', capacity: '' }],
        companySupplementFile: supplementFiles.length > 0 ? supplementFiles : null,
        companySupplementLink: toText(company.company_supplement_link),
        products,
        projectHighlights: mapProjectHighlights(highlightsByScope.get('material') || []),
        sampleProvided: toYesNo(materialProfile.sample_provided),
        sampleCost: toText(materialProfile.sample_cost),
        sampleDeliveryTime: toText(materialProfile.sample_delivery_time),
        freeShippingToHK: toYesNo(materialProfile.free_shipping_to_hk),
        ...commonFields('material'),
      };

      return NextResponse.json({ supplier, supplierId, status: supplierStatus });
    }

    return NextResponse.json({ supplier: null, status: supplierStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
