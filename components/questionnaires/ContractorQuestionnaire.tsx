import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FormCheckbox from '../FormCheckbox';
import FileUpload from '../FileUpload';
import MultiFileUpload from '../MultiFileUpload';
import MultiImageUpload from '../MultiImageUpload';
import { ContractorFormData, ProjectManager, DesignerProject, ProjectManagerProject } from '@/types/supplier';
import {
  formatRegisteredCapital,
  parseRegisteredCapital,
  REGISTERED_CAPITAL_CURRENCIES,
} from '@/lib/registeredCapital';

interface ContractorQuestionnaireProps {
  data: ContractorFormData;
  onChange: <K extends keyof ContractorFormData>(
    field: K,
    value: ContractorFormData[K]
  ) => void;
}

export default function ContractorQuestionnaire({
  data,
  onChange,
}: ContractorQuestionnaireProps) {
  const countryOptions = [
    { value: 'Hong Kong', label: 'Hong Kong 香港' },
    { value: 'China', label: 'China 中國' },
    { value: 'Macau', label: 'Macau 澳門' },
    { value: 'Taiwan', label: 'Taiwan 台灣' },
    { value: 'Singapore', label: 'Singapore 新加坡' },
    { value: 'Malaysia', label: 'Malaysia 馬來西亞' },
    { value: 'Japan', label: 'Japan 日本' },
    { value: 'South Korea', label: 'South Korea 韓國' },
    { value: 'Thailand', label: 'Thailand 泰國' },
    { value: 'Vietnam', label: 'Vietnam 越南' },
    { value: 'Philippines', label: 'Philippines 菲律賓' },
    { value: 'Indonesia', label: 'Indonesia 印尼' },
    { value: 'India', label: 'India 印度' },
    { value: 'United Arab Emirates', label: 'UAE 阿聯酋' },
    { value: 'United Kingdom', label: 'United Kingdom 英國' },
    { value: 'United States', label: 'United States 美國' },
    { value: 'Canada', label: 'Canada 加拿大' },
    { value: 'Australia', label: 'Australia 澳洲' },
    { value: 'Germany', label: 'Germany 德國' },
    { value: 'France', label: 'France 法國' },
  ];
  const projectTypeOptions = [
    { value: 'residential', label: 'Residential 住宅' },
    { value: 'commercial', label: 'Retail 零售' },
    { value: 'office', label: 'Office 辦公' },
    { value: 'hotel', label: 'Hotel 酒店' },
    { value: 'medical', label: 'Medical 醫療' },
    { value: 'education', label: 'Education 教育' },
    { value: 'industrial', label: 'Industrial 工業' },
    { value: 'other', label: 'Other 其他' },
  ];

  const isoOptions = [
    { value: '9001', label: 'ISO 9001' },
    { value: '14001', label: 'ISO 14001' },
    { value: '45001', label: 'ISO 45001' },
  ];

  // Initialize other certifications (handle legacy string data)
  const otherCerts = data.otherCertifications as any;
  if (!Array.isArray(otherCerts) || otherCerts.length === 0) {
    onChange('otherCertifications', [
      {
        id: `${Date.now()}-cert`,
        name: typeof otherCerts === 'string' ? otherCerts : '',
        file: null,
      },
    ]);
  }

  if (!data.isoCertificateUploads) {
    onChange('isoCertificateUploads', {});
  }

  // Project Highlights management functions
  const addProjectHighlight = () => {
    const newProject: DesignerProject = {
      id: Date.now().toString(),
      projectName: '',
      year: '',
      address: '',
      area: '',
      renovationType: '',
      projectTypes: [],
      projectHighlight: false,
      photos: [],
    };
    onChange('projectHighlights', [...(data.projectHighlights || []), newProject]);
  };

  const updateProjectHighlight = (
    projectId: string,
    field: keyof DesignerProject,
    value: any
  ) => {
    const updatedProjects = (data.projectHighlights || []).map((project) =>
      project.id === projectId ? { ...project, [field]: value } : project
    );
    onChange('projectHighlights', updatedProjects);
  };

  const removeProjectHighlight = (projectId: string) => {
    const updatedProjects = (data.projectHighlights || []).filter(
      (project) => project.id !== projectId
    );
    onChange('projectHighlights', updatedProjects);
  };

  const [showAutofillDialog, setShowAutofillDialog] = React.useState(false);
  const [autofillSource, setAutofillSource] = React.useState<DesignerProject | null>(null);
  const [autofillTarget, setAutofillTarget] = React.useState<{
    pmIndex: number;
    projectIndex: number;
  } | null>(null);

  const findHighlightByName = (projectName: string) => {
    const trimmedName = projectName.trim().toLowerCase();
    if (!trimmedName) return null;
    return (data.projectHighlights || []).find(
      (project) => project.projectName.trim().toLowerCase() === trimmedName
    );
  };

  const handleProjectNameBlur = (
    pmIndex: number,
    projectIndex: number,
    projectName: string
  ) => {
    const highlight = findHighlightByName(projectName);
    if (!highlight) return;
    setAutofillSource(highlight);
    setAutofillTarget({ pmIndex, projectIndex });
    setShowAutofillDialog(true);
  };

  const handleAutofillConfirm = () => {
    if (!autofillSource || !autofillTarget) return;
    const updated = [...(data.projectManagers || [])];
    const manager = updated[autofillTarget.pmIndex];
    if (!manager) return;
    const updatedProjects = [...(manager.projects || [])];
    const target = updatedProjects[autofillTarget.projectIndex];
    if (!target) return;
    updatedProjects[autofillTarget.projectIndex] = {
      ...target,
      year: autofillSource.year,
      buildingName: autofillSource.address,
      area: autofillSource.area,
    };
    updated[autofillTarget.pmIndex] = {
      ...manager,
      projects: updatedProjects,
    };
    onChange('projectManagers', updated);
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  const handleAutofillCancel = () => {
    setShowAutofillDialog(false);
    setAutofillSource(null);
    setAutofillTarget(null);
  };

  const toggleIsoCertification = (isoValue: string) => {
    const current = data.isocertifications || [];
    const exists = current.includes(isoValue);
    const nextSelected = exists
      ? current.filter((item) => item !== isoValue)
      : [...current, isoValue];
    onChange('isocertifications', nextSelected);

    const currentUploads = data.isoCertificateUploads || {};
    const nextUploads: Record<string, string | File | null> = {};
    nextSelected.forEach((iso) => {
      nextUploads[iso] = currentUploads[iso] ?? null;
    });
    onChange('isoCertificateUploads', nextUploads);
  };

  // Other certifications management
  const addOtherCertification = () => {
    onChange('otherCertifications', [
      ...(data.otherCertifications || []),
      { id: `${Date.now()}-cert`, name: '', file: null },
    ]);
  };

  const updateOtherCertification = (
    id: string,
    field: 'name' | 'file',
    value: string | File | null
  ) => {
    const updated = (data.otherCertifications || []).map((cert) =>
      cert.id === id ? { ...cert, [field]: value } : cert
    );
    onChange('otherCertifications', updated);
  };

  const removeOtherCertification = (id: string) => {
    const updated = (data.otherCertifications || []).filter((cert) => cert.id !== id);
    onChange(
      'otherCertifications',
      updated.length > 0 ? updated : [{ id: `${Date.now()}-cert`, name: '', file: null }]
    );
  };

  const tomorrowDateString = React.useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  const isHongKong = data.country === 'Hong Kong';
  const isChina = data.country === 'China';
  const capital = parseRegisteredCapital(data.registeredCapital);
  const hkRegistrationDigits = (data.hkBusinessRegistrationNumber || '').replace(/\D/g, '');
  const showHkRegistrationError =
    isHongKong && hkRegistrationDigits.length > 0 && hkRegistrationDigits.length !== 16;

  return (
    <>
      {/* Section 1: Company Profile */}
      <FormSection title="Section 1: Company Profile / 公司基本信息">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Company English Name / 公司英文名"
            name="companyName"
            value={data.companyName}
            onChange={(v) => onChange('companyName', v)}
          />

          <FormInput
            label="Company Chinese Name / 公司中文名"
            name="companyNameChinese"
            value={data.companyNameChinese || ''}
            onChange={(v) => onChange('companyNameChinese', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year of Incorporation / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px] gap-3">
            <FormInput
              label="Registered Capital Amount / 註冊資本數額"
              name="registeredCapitalAmount"
              type="number"
              required={!isHongKong}
              value={capital.amount}
              onChange={(v) =>
                onChange('registeredCapital', formatRegisteredCapital(v, capital.currency))
              }
            />
            <FormSelect
              label="Currency / 貨幣"
              name="registeredCapitalCurrency"
              required={!isHongKong}
              value={capital.currency}
              onChange={(v) =>
                onChange('registeredCapital', formatRegisteredCapital(capital.amount, String(v)))
              }
              options={REGISTERED_CAPITAL_CURRENCIES}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Number of Employees / 員工人數"
            name="numberOfEmployees"
            type="number"
            required
            value={data.numberOfEmployees}
            onChange={(v) => onChange('numberOfEmployees', v)}
          />

          <FormSelect
            label="Country / 國家和地區"
            name="country"
            required
            value={data.country}
            onChange={(v) => onChange('country', v as string)}
            options={countryOptions}
          />
        </div>

        {isHongKong && (
          <div>
            <FormInput
              label="Business Registration Number / 商業登記號"
              name="hkBusinessRegistrationNumber"
              required
              value={data.hkBusinessRegistrationNumber}
              onChange={(v) => onChange('hkBusinessRegistrationNumber', v)}
              placeholder="e.g., 12345678-000"
            />
            {showHkRegistrationError && (
              <p className="mt-1 text-xs text-red-600">
                Business Registration Number must be 16 digits / 商業登記號需為16位數字
              </p>
            )}
          </div>
        )}

        {isChina && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Business Registration Number / 工商註冊號"
              name="cnBusinessRegistrationNumber"
              required
              value={data.cnBusinessRegistrationNumber}
              onChange={(v) => onChange('cnBusinessRegistrationNumber', v)}
              placeholder="e.g., 123456789012345"
            />

            <FormInput
              label="Unified Social Credit Code / 統一社會信用代碼"
              name="cnUnifiedSocialCreditCode"
              required
              value={data.cnUnifiedSocialCreditCode}
              onChange={(v) => onChange('cnUnifiedSocialCreditCode', v)}
              placeholder="e.g., 123456789012345678"
            />
          </div>
        )}

        {isChina && (
          <FormInput
            label="Employees eligible to work legally in Hong Kong / 可以在香港合法工作的僱員數"
            name="hkWorkEligibleEmployees"
            type="number"
            required
            value={data.hkWorkEligibleEmployees}
            onChange={(v) => onChange('hkWorkEligibleEmployees', v)}
            placeholder="e.g., 5"
          />
        )}

        <FormInput
          label="Office Address / 辦公地址"
          name="officeAddress"
          required
          value={data.officeAddress}
          onChange={(v) => onChange('officeAddress', v)}
        />

        <div className="mt-4">
          <label className="block text-sm font-light text-gray-700 mb-1">
            Business Description / 公司或業務簡介{' '}
            <span className="text-gray-400">(Optional / 選填)</span>
          </label>
          <textarea
            value={data.businessDescription || ''}
            onChange={(e) => onChange('businessDescription', e.target.value)}
            rows={4}
            className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm"
            placeholder="Brief introduction of your company and business"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <FileUpload
            label="Business Registration / 商業登記證"
            name="businessRegistration"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.businessRegistration}
            onChange={(file) => onChange('businessRegistration', file)}
          />

          <FileUpload
            label="Company Photos / 公司形象照片"
            name="companyPhotos"
            accept=".jpg,.jpeg,.png"
            value={data.companyPhotos}
            onChange={(file) => onChange('companyPhotos', file)}
          />
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Company Brochure
          </h4>
          <p className="text-xs text-gray-500 mb-4">
            You can upload files or provide a link to your company website.
            <br />
            您可以上傳文件或提供公司網站連結。
          </p>

          <div className="space-y-4">
            <MultiFileUpload
              label="Upload Files / 上傳文件"
              name="companySupplementFile"
              accept=".pdf,.jpg,.jpeg,.png"
              maxFiles={10}
              value={data.companySupplementFile}
              onChange={(paths) =>
                onChange('companySupplementFile', paths.length > 0 ? paths : null)
              }
            />

            <FormInput
              label="Or enter company website / 或輸入公司網站"
              name="companySupplementLink"
              type="url"
              value={data.companySupplementLink}
              onChange={(v) => onChange('companySupplementLink', v)}
              placeholder="https://..."
            />
          </div>
        </div>
      </FormSection>

      {/* Section 2: Certifications */}
      <FormSection title="Section 2: Certifications / 資質與認證">
        <div className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Do you have RGBC certificate / 是否有RGBC牌 <span className="text-red-500">*</span>
              </label>
              <select
                value={data.constructionGrade === 'RGBC' ? 'yes' : 'no'}
                onChange={(e) => {
                  if (e.target.value === 'yes') {
                    onChange('constructionGrade', 'RGBC');
                  } else {
                    onChange('constructionGrade', '');
                    onChange('licenseNumber', '');
                  }
                }}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 sm:text-sm h-[42px]"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {data.constructionGrade === 'RGBC' && (
              <FormInput
                label="Certificate Number / 資質證書編號"
                name="licenseNumber"
                required
                value={data.licenseNumber}
                onChange={(v) => onChange('licenseNumber', v)}
              />
            )}

            <FileUpload
              label="Certificate Upload / 資質證書上傳"
              name="certificateUpload"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              value={data.certificateUpload}
              onChange={(file) => onChange('certificateUpload', file)}
            />
          </div>
        </div>

        <div>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-light text-gray-700">
                ISO Certification / ISO認證
              </label>
              <div className="space-y-3">
                {isoOptions.map((option) => {
                  const checked =
                    Array.isArray(data.isocertifications) &&
                    data.isocertifications.includes(option.value);
                  return (
                    <div
                      key={option.value}
                      className="p-3 border border-gray-200 rounded bg-white space-y-2"
                    >
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name={`iso-${option.value}`}
                          checked={checked}
                          onChange={() => toggleIsoCertification(option.value)}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>

                      {checked && (
                        <FileUpload
                          label={`${option.label} Certificate Upload / 證書上傳`}
                          name={`iso-${option.value}-upload`}
                          required
                          accept=".pdf,.jpg,.jpeg,.png"
                          value={data.isoCertificateUploads?.[option.value] || null}
                          onChange={(file) => {
                            onChange('isoCertificateUploads', {
                              ...(data.isoCertificateUploads || {}),
                              [option.value]: file,
                            });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-light text-gray-700">
                  Other Certifications / 其他認證
                  <span className="text-xs text-gray-500 ml-2">
                    Add items and upload certificates
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                {(data.otherCertifications || []).map((cert, index) => (
                  <div
                    key={cert.id}
                    className="p-4 border border-gray-200 bg-gray-50 rounded space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Certification {index + 1} / 認證 {index + 1}
                      </span>
                      {(data.otherCertifications || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOtherCertification(cert.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove / 刪除
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        label="Certification Name / 認證名稱"
                        name={`other-cert-${cert.id}`}
                        value={cert.name}
                        onChange={(v) => updateOtherCertification(cert.id, 'name', v)}
                        placeholder="e.g., CIC Safety Certificate"
                      />

                      <FileUpload
                        label="Certificate Upload / 證書上傳"
                        name={`other-cert-upload-${cert.id}`}
                        required={!!cert.name.trim()}
                        accept=".pdf,.jpg,.jpeg,.png"
                        value={cert.file}
                        onChange={(file) => updateOtherCertification(cert.id, 'file', file)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addOtherCertification}
                  className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
                >
                  + Add Certification / 添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 3: Construction Capability */}
      <FormSection title="Section 3: Construction Capability / 施工能力">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Areas of Expertise / 專業領域
          </h4>
          <FormSelect
            label="Property Types / 主要項目類型"
            name="projectTypes"
            type="checkbox"
            multiple
            required
            value={data.projectTypes}
            onChange={(v) => onChange('projectTypes', v as string[])}
            options={projectTypeOptions}
          />
        </div>

        {/* Project Highlights Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Project Highlights / 亮點項目
              <span className="text-red-500 ml-1">*</span>
            </h4>
          </div>

          {(!data.projectHighlights || data.projectHighlights.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500 text-sm">
                No projects added yet. Click "Add Project" to add project highlights.
                <br />
                尚未添加項目。點擊"添加項目"按鈕添加亮點項目。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(data.projectHighlights || []).map((project, index) => (
                <div
                  key={project.id}
                  className="border border-gray-200 p-6 bg-gray-50 rounded"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">
                      Project {index + 1} / 項目 {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeProjectHighlight(project.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      label="Project Name / 項目名稱"
                      name={`project-name-${project.id}`}
                      required
                      value={project.projectName}
                      onChange={(v) =>
                        updateProjectHighlight(project.id, 'projectName', v)
                      }
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Year / 年份"
                      name={`project-year-${project.id}`}
                      type="number"
                      required
                      value={project.year}
                      onChange={(v) =>
                        updateProjectHighlight(project.id, 'year', v)
                      }
                      placeholder="e.g., 2024"
                    />

                    <FormInput
                      label="Area (sqft) / 面積（平方呎）"
                      name={`project-area-${project.id}`}
                      type="number"
                      required
                      value={project.area}
                      onChange={(v) =>
                        updateProjectHighlight(project.id, 'area', v)
                      }
                      placeholder="e.g., 1500 sq ft"
                    />

                      <FormInput
                        label="Building Name / 大廈名稱"
                        name={`project-address-${project.id}`}
                        required
                        value={project.address}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'address', v)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormSelect
                        label="Project Scope / 是否重新裝修？"
                        name={`project-renovation-${project.id}`}
                        type="radio"
                        required
                        value={project.renovationType}
                        onChange={(v) =>
                          updateProjectHighlight(project.id, 'renovationType', v)
                        }
                        options={[
                          { value: 'newFitout', label: 'New Fitout 全新装修' },
                          { value: 'remodel', label: 'Remodel 改造翻新' },
                        ]}
                      />

                      {(() => {
                        const customType = (project.projectTypes || []).find((type) =>
                          type.startsWith('custom_')
                        );
                        const selectedType =
                          (project.projectTypes || []).find((type) => !type.startsWith('custom_')) ||
                          (customType ? 'other' : '');
                        const customValue = customType ? customType.slice(7) : '';
                        return (
                          <div className="space-y-2">
                            <FormSelect
                              label="Property Types / 主要項目類型"
                              name={`project-types-${project.id}`}
                              type="radio"
                              required
                              value={selectedType}
                              onChange={(v) => {
                                const value = String(v);
                                if (value === 'other') {
                                  const next = customValue
                                    ? ['other', `custom_${customValue}`]
                                    : ['other'];
                                  updateProjectHighlight(project.id, 'projectTypes', next);
                                  return;
                                }
                                updateProjectHighlight(project.id, 'projectTypes', [value]);
                              }}
                              options={projectTypeOptions}
                            />
                            {selectedType === 'other' && (
                              <input
                                type="text"
                                value={customValue}
                                onChange={(e) => {
                                  const value = e.target.value.trim();
                                  const next = value ? ['other', `custom_${value}`] : ['other'];
                                  updateProjectHighlight(project.id, 'projectTypes', next);
                                }}
                                placeholder="Enter other type / 請輸入其他類型"
                                className="w-full px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                              />
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <MultiImageUpload
                      label="Project Photos / 項目照片"
                      name={`project-photos-${project.id}`}
                      maxFiles={9}
                      value={project.photos}
                      onChange={(files) =>
                        updateProjectHighlight(project.id, 'photos', files)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addProjectHighlight}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Project / 添加項目
            </button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Company Scale / 公司規模
          </h4>
          <div className="space-y-4">
            <FormInput
              label="Accumulated Project Area per Year (sqft) / 年施工面積（平方呎）"
              name="annualConstructionCapacity"
              type="number"
              required
              value={data.annualConstructionCapacity}
              onChange={(v) => onChange('annualConstructionCapacity', v)}
              placeholder="e.g., 100000"
            />

            <FormInput
              label="Maximum Number of Projects in Parallel / 最多能同時承接的項目數"
              name="maxConcurrentProjects"
              type="number"
              required
              value={data.maxConcurrentProjects}
              onChange={(v) => onChange('maxConcurrentProjects', v)}
              placeholder="e.g., 5"
            />

            <FormInput
              label="Average Project Value (HKD) / 平均項目金額（港幣）"
              name="largestProjectValue"
              type="number"
              required
              value={data.largestProjectValue}
              onChange={(v) => onChange('largestProjectValue', v)}
              placeholder="e.g., 5000000"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 5: Personnel */}
      <FormSection title="Section 5: Personnel / 人員">
        <div className="mb-6">
          <FileUpload
            label="Company Organization Chart / 公司組織架構圖"
            name="organizationChart"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            value={data.organizationChart}
            onChange={(file) => onChange('organizationChart', file)}
          />
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Project Managers / 項目經理
          </h4>

          <div className="space-y-6">
            {(data.projectManagers || []).map((pm, pmIndex) => (
              <div key={pm.id} className="p-4 border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Project Manager #{pmIndex + 1} / 項目經理 #{pmIndex + 1}
                  </h5>
                  {(data.projectManagers || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (data.projectManagers || []).filter((_, i) => i !== pmIndex);
                        onChange('projectManagers', updated);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove / 刪除
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <FormInput
                    label="Name / 姓名"
                    name={`pm-name-${pmIndex}`}
                    required
                    value={pm.name}
                    onChange={(v) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[pmIndex] = { ...updated[pmIndex], name: v };
                      onChange('projectManagers', updated);
                    }}
                  />

                  <FormInput
                    label="Year of Experience / 年資"
                    name={`pm-experience-${pmIndex}`}
                    type="number"
                    required
                    value={pm.yearsExperience || ''}
                    onChange={(v) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[pmIndex] = { ...updated[pmIndex], yearsExperience: v };
                      onChange('projectManagers', updated);
                    }}
                    placeholder="e.g., 8"
                  />

                  <FormInput
                    label="Languages / 語言"
                    name={`pm-languages-${pmIndex}`}
                    required
                    value={pm.languages}
                    onChange={(v) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[pmIndex] = { ...updated[pmIndex], languages: v };
                      onChange('projectManagers', updated);
                    }}
                    placeholder="e.g., English, Chinese, Spanish"
                  />

                  {/* Projects Section */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-light text-gray-700">
                        Projects / 項目經歷
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      {(pm.projects || []).map((project, projectIndex) => (
                        <div
                          key={project.id}
                          className="p-4 border border-gray-200 bg-white rounded space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Project {projectIndex + 1} / 項目 {projectIndex + 1}
                            </span>
                            {(pm.projects || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(data.projectManagers || [])];
                                  updated[pmIndex] = {
                                    ...updated[pmIndex],
                                    projects: updated[pmIndex].projects.filter(
                                      (_, idx) => idx !== projectIndex
                                    ),
                                  };
                                  onChange('projectManagers', updated);
                                }}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Remove / 刪除
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput
                              label="Project Name / 項目名稱"
                              name={`pm-${pmIndex}-project-${projectIndex}-name`}
                              required
                              value={project.projectName}
                              onChange={(v) => {
                                const updated = [...(data.projectManagers || [])];
                                const updatedProjects = [...updated[pmIndex].projects];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  projectName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('projectManagers', updated);
                              }}
                              onBlur={(v) => handleProjectNameBlur(pmIndex, projectIndex, v)}
                            />

                            <FormInput
                              label="Client Name / 客戶名稱"
                              name={`pm-${pmIndex}-project-${projectIndex}-client`}
                              required
                              value={project.clientName}
                              onChange={(v) => {
                                const updated = [...(data.projectManagers || [])];
                                const updatedProjects = [...updated[pmIndex].projects];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  clientName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('projectManagers', updated);
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormInput
                              label="Year / 年份"
                              name={`pm-${pmIndex}-project-${projectIndex}-year`}
                              type="number"
                              required
                              value={project.year}
                              onChange={(v) => {
                                const updated = [...(data.projectManagers || [])];
                                const updatedProjects = [...updated[pmIndex].projects];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  year: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('projectManagers', updated);
                              }}
                              placeholder="e.g., 2023"
                            />

                            <FormInput
                              label="Building Name / 大廈名稱"
                              name={`pm-${pmIndex}-project-${projectIndex}-building`}
                              required
                              value={project.buildingName}
                              onChange={(v) => {
                                const updated = [...(data.projectManagers || [])];
                                const updatedProjects = [...updated[pmIndex].projects];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  buildingName: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('projectManagers', updated);
                              }}
                            />

                            <FormInput
                              label="Area (sqft) / 面積（平方呎）"
                              name={`pm-${pmIndex}-project-${projectIndex}-area`}
                              type="number"
                              required
                              value={project.area}
                              onChange={(v) => {
                                const updated = [...(data.projectManagers || [])];
                                const updatedProjects = [...updated[pmIndex].projects];
                                updatedProjects[projectIndex] = {
                                  ...updatedProjects[projectIndex],
                                  area: v,
                                };
                                updated[pmIndex] = {
                                  ...updated[pmIndex],
                                  projects: updatedProjects,
                                };
                                onChange('projectManagers', updated);
                              }}
                              placeholder="e.g., 5000"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(data.projectManagers || [])];
                          const newProject: ProjectManagerProject = {
                            id: `${Date.now()}-${Math.random()}`,
                            projectName: '',
                            clientName: '',
                            year: '',
                            buildingName: '',
                            area: '',
                          };
                          updated[pmIndex] = {
                            ...updated[pmIndex],
                            projects: [...(updated[pmIndex].projects || []), newProject],
                          };
                          onChange('projectManagers', updated);
                        }}
                        className="px-3 py-1 bg-gray-900 text-white text-xs font-light hover:bg-gray-800 transition-colors"
                      >
                        + Add Project / 添加項目經歷
                      </button>
                    </div>
                  </div>

                  <FileUpload
                    label="Project Manager CV / 項目經理簡歷"
                    name={`pm-cv-${pmIndex}`}
                    accept=".pdf,.doc,.docx"
                    value={pm.cv}
                    onChange={(file) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[pmIndex] = { ...updated[pmIndex], cv: file };
                      onChange('projectManagers', updated);
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newPM: ProjectManager = {
                  id: Date.now().toString(),
                  name: '',
                  yearsExperience: '',
                  languages: '',
                  mainProject: '',
                  year: '',
                  address: '',
                  area: '',
                  projects: [
                    {
                      id: `${Date.now()}-project`,
                      projectName: '',
                      clientName: '',
                      year: '',
                      buildingName: '',
                      area: '',
                    },
                  ],
                  cv: null,
                };
                onChange('projectManagers', [...(data.projectManagers || []), newPM]);
              }}
              className="w-full py-2.5 border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              + Add Project Manager / 添加項目經理
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <FormSelect
              label="Do you have Safety Officer(s)? / 是否有安全主任？"
              name="hasSafetyOfficer"
              type="radio"
              required
              value={data.hasSafetyOfficer}
              onChange={(v) => onChange('hasSafetyOfficer', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            {data.hasSafetyOfficer === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of Safety Officers / 安全主任人數"
                  name="numberOfSafetyOfficers"
                  type="number"
                  required
                  value={data.numberOfSafetyOfficers}
                  onChange={(v) => onChange('numberOfSafetyOfficers', v)}
                  placeholder="e.g., 3"
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Do you have Construction Manager(s)? / 是否有施工經理？"
              name="hasConstructionManager"
              type="radio"
              required
              value={data.hasConstructionManager}
              onChange={(v) => onChange('hasConstructionManager', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

              {data.hasConstructionManager === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of Construction Managers / 施工經理人數"
                  name="numberOfConstructionManagers"
                  type="number"
                  required
                  value={data.numberOfConstructionManagers}
                  onChange={(v) => onChange('numberOfConstructionManagers', v)}
                  placeholder="e.g., 5"
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Do you have MEP Lead(s)? / 是否有機電負責人？"
              name="hasMepLead"
              type="radio"
              required
              value={data.hasMepLead}
              onChange={(v) => onChange('hasMepLead', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            {data.hasMepLead === 'yes' && (
              <div className="mt-4">
                <FormInput
                  label="Number of MEP Leads / 機電負責人人數"
                  name="numberOfMepLeads"
                  type="number"
                  required
                  value={data.numberOfMepLeads}
                  onChange={(v) => onChange('numberOfMepLeads', v)}
                  placeholder="e.g., 2"
                />
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 6: Compliance and Governance */}
      <FormSection title="Section 6: Compliance and Governance / 合規與治理">
        {isChina && (
          <div className="mb-6">
            <FormCheckbox
              label="If taking projects in Hong Kong, we commit to hiring workers who can legally work in Hong Kong and hold valid HKID and Construction Safety Certificate / 如在香港承接項目，保證聘請可在香港合法工作的工人且持有有效香港身份證與建造業安全證明書（平安咭）"
              name="cnHkProjectCompliance"
              checked={!!data.cnHkProjectCompliance}
              onChange={(v) => onChange('cnHkProjectCompliance', v)}
              required
            />
          </div>
        )}

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Insurance / 保險 (At least one required / 至少需要一個)
          </h4>

          <div className="space-y-6">
            {(data.insurances || []).map((insurance, index) => (
              <div key={insurance.id} className="p-4 border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Insurance #{index + 1} / 保險 #{index + 1}
                  </h5>
                  {(data.insurances || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (data.insurances || []).filter((_, i) => i !== index);
                        onChange('insurances', updated);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove / 刪除
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <FormSelect
                    label="Insurance Type / 保險類型"
                    name={`insurance-type-${index}`}
                    required
                    value={insurance.type}
                    onChange={(v) => {
                      const updated = [...(data.insurances || [])];
                      updated[index] = { ...updated[index], type: v as string };
                      onChange('insurances', updated);
                    }}
                    options={[
                      { value: "Contractors' All Risks", label: "Contractors' All Risks 建築工程保險" },
                      { value: 'General Liability insurance', label: 'General Liability insurance 第三者責任保險' },
                      { value: 'Worker Compensation', label: 'Worker Compensation 僱員補償保險' },
                    ]}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Insurance Provider / 保險公司"
                      name={`insurance-provider-${index}`}
                      required
                      value={insurance.provider}
                      onChange={(v) => {
                        const updated = [...(data.insurances || [])];
                        updated[index] = { ...updated[index], provider: v };
                        onChange('insurances', updated);
                      }}
                      placeholder="e.g., AIA, HSBC Insurance"
                    />

                    <FormInput
                      label="Expiry Date / 到期日期"
                      name={`insurance-expiry-${index}`}
                      type="date"
                      required
                      value={insurance.expiryDate}
                      min={tomorrowDateString}
                      onChange={(v) => {
                        const updated = [...(data.insurances || [])];
                        updated[index] = { ...updated[index], expiryDate: v };
                        onChange('insurances', updated);
                      }}
                    />
                  </div>

                  <FileUpload
                    label="Insurance Certificate / 保險證明"
                    name={`insurance-file-${index}`}
                    accept=".pdf,.jpg,.jpeg,.png"
                    value={insurance.file}
                    onChange={(file) => {
                      const updated = [...(data.insurances || [])];
                      updated[index] = { ...updated[index], file };
                      onChange('insurances', updated);
                    }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => {
                const newInsurance = {
                  id: Date.now().toString(),
                  type: '',
                  provider: '',
                  expiryDate: '',
                  file: null,
                };
                onChange('insurances', [...(data.insurances || []), newInsurance]);
              }}
              className="w-full py-2.5 border border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors"
            >
              + Add Insurance / 添加保險
            </button>
          </div>
        </div>

        <div className="mb-6">
          <FormSelect
            label="Do you have Environmental Health and Safety policy? / 是否有環境健康安全政策？"
            name="hasEnvironmentalHealthSafety"
            type="radio"
            required
            value={data.hasEnvironmentalHealthSafety}
            onChange={(v) => onChange('hasEnvironmentalHealthSafety', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.hasEnvironmentalHealthSafety === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Environmental Health and Safety Document / 環境健康安全文件"
                name="environmentalHealthSafetyFile"
                accept=".pdf"
                value={data.environmentalHealthSafetyFile}
                onChange={(file) => onChange('environmentalHealthSafetyFile', file)}
              />
            </div>
          )}
        </div>

        <div className="mb-6">
          <FormSelect
            label="Any incidents in the past 3 years? / 過去3年是否有任何事故？"
            name="hasIncidentsPast3Years"
            type="radio"
            required
            value={data.hasIncidentsPast3Years}
            onChange={(v) => onChange('hasIncidentsPast3Years', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.hasIncidentsPast3Years === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Incidents Report / 事故報告"
                name="incidentsFile"
                required
                accept=".pdf"
                value={data.incidentsFile}
                onChange={(file) => onChange('incidentsFile', file)}
              />
            </div>
          )}
        </div>

        <div>
          <FormSelect
            label="Any litigation in the past 3 years? / 過去3年是否有任何訴訟？"
            name="hasLitigationPast3Years"
            type="radio"
            required
            value={data.hasLitigationPast3Years}
            onChange={(v) => onChange('hasLitigationPast3Years', v as 'yes' | 'no')}
            options={[
              { value: 'yes', label: 'Yes 有' },
              { value: 'no', label: 'No 無' },
            ]}
          />

          {data.hasLitigationPast3Years === 'yes' && (
            <div className="mt-4">
              <FileUpload
                label="Litigation Report / 訴訟報告"
                name="litigationFile"
                required
                accept=".pdf"
                value={data.litigationFile}
                onChange={(file) => onChange('litigationFile', file)}
              />
            </div>
          )}
        </div>
      </FormSection>
      {/* Project Autofill Confirmation Dialog */}
      {showAutofillDialog && autofillSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2 whitespace-nowrap">
                Duplicate Project Name Detected / 檢測到重複的項目名稱
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A project with the name "{autofillSource.projectName}" already exists. Would you like to autofill the project details?
                <br />
                <br />
                已存在名為 "{autofillSource.projectName}" 的項目。是否需要自動填充項目信息？
              </p>

              <div className="bg-gray-50 rounded p-3 mb-4 text-xs">
                <p className="font-medium text-gray-700 mb-2 whitespace-nowrap">Existing project details / 現有項目詳情:</p>
                <div className="space-y-1 text-gray-600">
                  {autofillSource.year && <div className="whitespace-nowrap">Year / 年份: {autofillSource.year}</div>}
                  {autofillSource.area && <div className="whitespace-nowrap">Area / 面積: {autofillSource.area}</div>}
                  {autofillSource.address && <div className="whitespace-nowrap">Building Name / 大廈名稱: {autofillSource.address}</div>}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleAutofillCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  No, Keep Current / 否，保持當前
                </button>
                <button
                  type="button"
                  onClick={handleAutofillConfirm}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors whitespace-nowrap"
                >
                  Yes, Autofill / 是，自動填充
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
