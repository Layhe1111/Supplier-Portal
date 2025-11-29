import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import { ContractorFormData } from '@/types/supplier';

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
  const projectTypeOptions = [
    { value: 'residential', label: 'Residential 住宅' },
    { value: 'commercial', label: 'Commercial 商業' },
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

  return (
    <>
      {/* Section 1: Company Profile */}
      <FormSection title="Section 1: Company Profile / 公司基本信息">
        <FormInput
          label="Company Legal Name / 公司全稱"
          name="companyLegalName"
          required
          value={data.companyLegalName}
          onChange={(v) => onChange('companyLegalName', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Year Established / 成立年份"
            name="yearEstablished"
            type="number"
            required
            value={data.yearEstablished}
            onChange={(v) => onChange('yearEstablished', v)}
          />

          <FormInput
            label="Registered Capital / 註冊資本"
            name="registeredCapital"
            required
            placeholder="e.g., HKD 1,000,000"
            value={data.registeredCapital}
            onChange={(v) => onChange('registeredCapital', v)}
          />
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

          <FormInput
            label="Office Address / 辦公地址"
            name="officeAddress"
            required
            value={data.officeAddress}
            onChange={(v) => onChange('officeAddress', v)}
          />
        </div>
      </FormSection>

      {/* Section 2: Certifications */}
      <FormSection title="Section 2: Certifications / 資質與認證">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Business Licenses / 資質等級
          </h4>
          <div className="space-y-4">
            <FormInput
              label="Construction Grade / 施工資質等級"
              name="constructionGrade"
              required
              value={data.constructionGrade}
              onChange={(v) => onChange('constructionGrade', v)}
            />

            <FormInput
              label="License Number / 資質證書編號"
              name="licenseNumber"
              required
              value={data.licenseNumber}
              onChange={(v) => onChange('licenseNumber', v)}
            />

            <FileUpload
              label="Certificate Upload / 資質證書上傳"
              name="certificateUpload"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(file) => onChange('certificateUpload', file)}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Safety Certifications / 安全認證
          </h4>
          <div className="space-y-4">
            <FormSelect
              label="Safety Production License / 安全生產許可證"
              name="safetyProductionLicense"
              type="radio"
              required
              value={data.safetyProductionLicense}
              onChange={(v) => onChange('safetyProductionLicense', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 有' },
                { value: 'no', label: 'No 無' },
              ]}
            />

            <FormSelect
              label="ISO Certification / ISO認證"
              name="isocertifications"
              type="checkbox"
              multiple
              value={data.isocertifications}
              onChange={(v) => onChange('isocertifications', v as string[])}
              options={isoOptions}
            />

            <FormInput
              label="Other Certifications / 其他認證"
              name="otherCertifications"
              value={data.otherCertifications}
              onChange={(v) => onChange('otherCertifications', v)}
              placeholder="List any other certifications..."
            />
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
            label="Project Types / 主要工程類型"
            name="projectTypes"
            type="checkbox"
            multiple
            required
            value={data.projectTypes}
            onChange={(v) => onChange('projectTypes', v as string[])}
            options={projectTypeOptions}
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Construction Scale / 施工規模
          </h4>
          <div className="space-y-4">
            <FormInput
              label="Annual Construction Capacity / 年施工能力 (sqft)"
              name="annualConstructionCapacity"
              type="number"
              required
              value={data.annualConstructionCapacity}
              onChange={(v) => onChange('annualConstructionCapacity', v)}
              placeholder="e.g., 100000"
            />

            <FormInput
              label="Maximum Concurrent Projects / 同時承接項目數"
              name="maxConcurrentProjects"
              type="number"
              required
              value={data.maxConcurrentProjects}
              onChange={(v) => onChange('maxConcurrentProjects', v)}
              placeholder="e.g., 5"
            />

            <FormInput
              label="Largest Project Value / 最大項目金額 (HKD)"
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
    </>
  );
}
