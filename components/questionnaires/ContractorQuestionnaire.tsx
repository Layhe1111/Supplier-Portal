import React, { useState } from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import { ContractorFormData, ProjectManager } from '@/types/supplier';

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

      {/* Section 5: Personnel */}
      <FormSection title="Section 5: Personnel / 人員">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Project Managers / 項目經理
          </h4>

          <div className="space-y-6">
            {(data.projectManagers || []).map((pm, index) => (
              <div key={pm.id} className="p-4 border border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-sm font-medium text-gray-700">
                    Project Manager #{index + 1} / 項目經理 #{index + 1}
                  </h5>
                  {(data.projectManagers || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (data.projectManagers || []).filter((_, i) => i !== index);
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
                    name={`pm-name-${index}`}
                    required
                    value={pm.name}
                    onChange={(v) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[index] = { ...updated[index], name: v };
                      onChange('projectManagers', updated);
                    }}
                  />

                  <FormInput
                    label="Languages / 語言"
                    name={`pm-languages-${index}`}
                    required
                    value={pm.languages}
                    onChange={(v) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[index] = { ...updated[index], languages: v };
                      onChange('projectManagers', updated);
                    }}
                    placeholder="e.g., English, Chinese, Spanish"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Main Project / 主要項目"
                      name={`pm-mainProject-${index}`}
                      required
                      value={pm.mainProject}
                      onChange={(v) => {
                        const updated = [...(data.projectManagers || [])];
                        updated[index] = { ...updated[index], mainProject: v };
                        onChange('projectManagers', updated);
                      }}
                    />

                    <FormInput
                      label="Year / 年份"
                      name={`pm-year-${index}`}
                      type="number"
                      required
                      value={pm.year}
                      onChange={(v) => {
                        const updated = [...(data.projectManagers || [])];
                        updated[index] = { ...updated[index], year: v };
                        onChange('projectManagers', updated);
                      }}
                      placeholder="e.g., 2023"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Address / 地址"
                      name={`pm-address-${index}`}
                      required
                      value={pm.address}
                      onChange={(v) => {
                        const updated = [...(data.projectManagers || [])];
                        updated[index] = { ...updated[index], address: v };
                        onChange('projectManagers', updated);
                      }}
                    />

                    <FormInput
                      label="Area (sqft) / 面積"
                      name={`pm-area-${index}`}
                      type="number"
                      required
                      value={pm.area}
                      onChange={(v) => {
                        const updated = [...(data.projectManagers || [])];
                        updated[index] = { ...updated[index], area: v };
                        onChange('projectManagers', updated);
                      }}
                      placeholder="e.g., 5000"
                    />
                  </div>

                  <FileUpload
                    label="Project Manager CV / 項目經理簡歷 (Optional)"
                    name={`pm-cv-${index}`}
                    accept=".pdf,.doc,.docx"
                    onChange={(file) => {
                      const updated = [...(data.projectManagers || [])];
                      updated[index] = { ...updated[index], cv: file };
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
                  languages: '',
                  mainProject: '',
                  year: '',
                  address: '',
                  area: '',
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

        <div className="mb-6">
          <FileUpload
            label="Company Organization Chart / 公司組織架構圖"
            name="organizationChart"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(file) => onChange('organizationChart', file)}
          />
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
        </div>
      </FormSection>

      {/* Section 6: Compliance and Governance */}
      <FormSection title="Section 6: Compliance and Governance / 合規與治理">
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
                  <FormInput
                    label="Insurance Type / 保險類型"
                    name={`insurance-type-${index}`}
                    required
                    value={insurance.type}
                    onChange={(v) => {
                      const updated = [...(data.insurances || [])];
                      updated[index] = { ...updated[index], type: v };
                      onChange('insurances', updated);
                    }}
                    placeholder="e.g., Liability Insurance, Workers Compensation"
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
                      onChange={(v) => {
                        const updated = [...(data.insurances || [])];
                        updated[index] = { ...updated[index], expiryDate: v };
                        onChange('insurances', updated);
                      }}
                    />
                  </div>

                  <FileUpload
                    label="Insurance Certificate / 保險證明 (Optional)"
                    name={`insurance-file-${index}`}
                    accept=".pdf,.jpg,.jpeg,.png"
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
                label="Environmental Health and Safety Document / 環境健康安全文件 (Optional)"
                name="environmentalHealthSafetyFile"
                accept=".pdf"
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
                onChange={(file) => onChange('litigationFile', file)}
              />
            </div>
          )}
        </div>
      </FormSection>
    </>
  );
}
