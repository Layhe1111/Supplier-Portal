import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import FileUpload from '../FileUpload';
import { DesignerFormData, ProjectManager, Insurance } from '@/types/supplier';

interface DesignerDBSectionProps {
  data: DesignerFormData;
  onChange: <K extends keyof DesignerFormData>(
    field: K,
    value: DesignerFormData[K]
  ) => void;
  addDbProjectManager: () => void;
  updateDbProjectManager: (id: string, field: keyof ProjectManager, value: any) => void;
  removeDbProjectManager: (id: string) => void;
  addDbInsurance: () => void;
  updateDbInsurance: (id: string, field: keyof Insurance, value: any) => void;
  removeDbInsurance: (id: string) => void;
}

export default function DesignerDBSection({
  data,
  onChange,
  addDbProjectManager,
  updateDbProjectManager,
  removeDbProjectManager,
  addDbInsurance,
  updateDbInsurance,
  removeDbInsurance,
}: DesignerDBSectionProps) {
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
    <div className="space-y-8">
      {/* D&B Section 2: Certifications */}
      <FormSection title="D&B Certifications / D&B資質與認證">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Business Licenses / 資質等級
          </h4>
          <div className="space-y-4">
            <FormInput
              label="Construction Grade / 施工資質等級"
              name="dbConstructionGrade"
              required
              value={data.dbConstructionGrade}
              onChange={(v) => onChange('dbConstructionGrade', v)}
            />

            <FormInput
              label="License Number / 資質證書號"
              name="dbLicenseNumber"
              required
              value={data.dbLicenseNumber}
              onChange={(v) => onChange('dbLicenseNumber', v)}
            />

            <FileUpload
              label="Certificate Upload / 資質證書上傳"
              name="dbCertificateUpload"
              required
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(file) => onChange('dbCertificateUpload', file)}
            />
          </div>
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Safety & Quality Certifications / 安全與質量認證
          </h4>
          <div className="space-y-4">
            <FormSelect
              label="Safety Production License / 安全生產許可證"
              name="dbSafetyProductionLicense"
              type="radio"
              required
              value={data.dbSafetyProductionLicense}
              onChange={(v) => onChange('dbSafetyProductionLicense', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            <FormSelect
              label="ISO Certifications / ISO認證"
              name="dbIsocertifications"
              type="checkbox"
              multiple
              value={data.dbIsocertifications}
              onChange={(v) => onChange('dbIsocertifications', v as string[])}
              options={isoOptions}
            />

            <FormInput
              label="Other Certifications / 其他認證"
              name="dbOtherCertifications"
              value={data.dbOtherCertifications}
              onChange={(v) => onChange('dbOtherCertifications', v)}
              placeholder="e.g., LEED, Green Building, etc."
            />
          </div>
        </div>
      </FormSection>

      {/* D&B Section 3: Construction Capability */}
      <FormSection title="D&B Construction Capability / D&B施工能力">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Areas of Expertise / 專業領域
          </h4>
          <FormSelect
            label="Project Types / 主要工程類型"
            name="dbProjectTypes"
            type="checkbox"
            multiple
            required
            value={data.dbProjectTypes}
            onChange={(v) => onChange('dbProjectTypes', v as string[])}
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
              name="dbAnnualConstructionCapacity"
              type="number"
              required
              value={data.dbAnnualConstructionCapacity}
              onChange={(v) => onChange('dbAnnualConstructionCapacity', v)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Max Concurrent Projects / 最大同時項目數"
                name="dbMaxConcurrentProjects"
                type="number"
                required
                value={data.dbMaxConcurrentProjects}
                onChange={(v) => onChange('dbMaxConcurrentProjects', v)}
              />

              <FormInput
                label="Largest Project Value / 最大單項工程金額 (HKD)"
                name="dbLargestProjectValue"
                type="number"
                required
                value={data.dbLargestProjectValue}
                onChange={(v) => onChange('dbLargestProjectValue', v)}
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* D&B Section 5: Personnel */}
      <FormSection title="D&B Personnel / D&B人員配置">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Project Managers / 項目經理
              <span className="text-red-500 ml-1">*</span>
            </h4>
            <button
              type="button"
              onClick={addDbProjectManager}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Project Manager / 添加項目經理
            </button>
          </div>

          {(!data.dbProjectManagers || data.dbProjectManagers.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500 text-sm">
                No project managers added. Click "Add Project Manager" to add personnel information.
                <br />
                尚未添加項目經理。點擊"添加項目經理"按鈕添加人員信息。
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {data.dbProjectManagers.map((pm, index) => (
                <div key={pm.id} className="border border-gray-200 p-6 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-medium text-gray-900">
                      Project Manager {index + 1} / 項目經理 {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeDbProjectManager(pm.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="space-y-4">
                    <FormInput
                      label="Name / 姓名"
                      name={`db-pm-name-${pm.id}`}
                      required
                      value={pm.name}
                      onChange={(v) => updateDbProjectManager(pm.id, 'name', v)}
                    />

                    <FormInput
                      label="Languages / 語言能力"
                      name={`db-pm-languages-${pm.id}`}
                      required
                      value={pm.languages}
                      onChange={(v) => updateDbProjectManager(pm.id, 'languages', v)}
                      placeholder="e.g., Cantonese, English, Mandarin"
                    />

                    <FormInput
                      label="Main Project / 主要項目"
                      name={`db-pm-project-${pm.id}`}
                      required
                      value={pm.mainProject}
                      onChange={(v) => updateDbProjectManager(pm.id, 'mainProject', v)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormInput
                        label="Year / 年份"
                        name={`db-pm-year-${pm.id}`}
                        type="number"
                        required
                        value={pm.year}
                        onChange={(v) => updateDbProjectManager(pm.id, 'year', v)}
                      />

                      <FormInput
                        label="Address / 地址"
                        name={`db-pm-address-${pm.id}`}
                        required
                        value={pm.address}
                        onChange={(v) => updateDbProjectManager(pm.id, 'address', v)}
                      />

                      <FormInput
                        label="Area / 面積"
                        name={`db-pm-area-${pm.id}`}
                        required
                        value={pm.area}
                        onChange={(v) => updateDbProjectManager(pm.id, 'area', v)}
                        placeholder="e.g., 1500 sq ft"
                      />
                    </div>

                    <FileUpload
                      label="CV / 簡歷"
                      name={`db-pm-cv-${pm.id}`}
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(file) => updateDbProjectManager(pm.id, 'cv', file)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <FileUpload
          label="Organization Chart / 組織架構圖"
          name="dbOrganizationChart"
          required
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(file) => onChange('dbOrganizationChart', file)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <FormSelect
              label="Safety Officer / 專職安全員"
              name="dbHasSafetyOfficer"
              type="radio"
              required
              value={data.dbHasSafetyOfficer}
              onChange={(v) => onChange('dbHasSafetyOfficer', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            {data.dbHasSafetyOfficer === 'yes' && (
              <FormInput
                label="Number of Safety Officers / 專職安全員人數"
                name="dbNumberOfSafetyOfficers"
                type="number"
                required
                value={data.dbNumberOfSafetyOfficers}
                onChange={(v) => onChange('dbNumberOfSafetyOfficers', v)}
              />
            )}
          </div>

          <div className="space-y-4">
            <FormSelect
              label="Construction Manager / 專職施工管理人員"
              name="dbHasConstructionManager"
              type="radio"
              required
              value={data.dbHasConstructionManager}
              onChange={(v) => onChange('dbHasConstructionManager', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            {data.dbHasConstructionManager === 'yes' && (
              <FormInput
                label="Number of Construction Managers / 專職施工管理人數"
                name="dbNumberOfConstructionManagers"
                type="number"
                required
                value={data.dbNumberOfConstructionManagers}
                onChange={(v) => onChange('dbNumberOfConstructionManagers', v)}
              />
            )}
          </div>
        </div>
      </FormSection>

      {/* D&B Section 6: Compliance and Governance */}
      <FormSection title="D&B Compliance and Governance / D&B合規與治理">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">
              Insurance Coverage / 保險覆蓋
              <span className="text-red-500 ml-1">*</span>
            </h4>
            <button
              type="button"
              onClick={addDbInsurance}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-light hover:bg-gray-800 transition-colors"
            >
              + Add Insurance / 添加保險
            </button>
          </div>

          {(!data.dbInsurances || data.dbInsurances.length === 0) ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded">
              <p className="text-gray-500 text-sm">
                No insurance added. Click "Add Insurance" to add insurance information.
                <br />
                尚未添加保險。點擊"添加保險"按鈕添加保險信息。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.dbInsurances.map((insurance, index) => (
                <div key={insurance.id} className="border border-gray-200 p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-900">
                      Insurance {index + 1} / 保險 {index + 1}
                    </h5>
                    <button
                      type="button"
                      onClick={() => removeDbInsurance(insurance.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove / 刪除
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                      label="Insurance Type / 保險類型"
                      name={`db-insurance-type-${insurance.id}`}
                      required
                      value={insurance.type}
                      onChange={(v) => updateDbInsurance(insurance.id, 'type', v)}
                      placeholder="e.g., Liability, Workers Comp"
                    />

                    <FormInput
                      label="Provider / 保險公司"
                      name={`db-insurance-provider-${insurance.id}`}
                      required
                      value={insurance.provider}
                      onChange={(v) => updateDbInsurance(insurance.id, 'provider', v)}
                    />

                    <FormInput
                      label="Expiry Date / 到期日"
                      name={`db-insurance-expiry-${insurance.id}`}
                      type="date"
                      required
                      value={insurance.expiryDate}
                      onChange={(v) => updateDbInsurance(insurance.id, 'expiryDate', v)}
                    />
                  </div>

                  <div className="mt-3">
                    <FileUpload
                      label="Insurance Certificate / 保險證明"
                      name={`db-insurance-file-${insurance.id}`}
                      required
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(file) => updateDbInsurance(insurance.id, 'file', file)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <FormSelect
              label="Environmental, Health & Safety Policy / 環保與健康安全政策"
              name="dbHasEnvironmentalHealthSafety"
              type="radio"
              required
              value={data.dbHasEnvironmentalHealthSafety}
              onChange={(v) => onChange('dbHasEnvironmentalHealthSafety', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            {data.dbHasEnvironmentalHealthSafety === 'yes' && (
              <div className="mt-3">
                <FileUpload
                  label="Upload Policy Document / 上傳政策文件"
                  name="dbEnvironmentalHealthSafetyFile"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(file) => onChange('dbEnvironmentalHealthSafetyFile', file)}
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Any Incidents in Past 3 Years / 過去3年是否有事故"
              name="dbHasIncidentsPast3Years"
              type="radio"
              required
              value={data.dbHasIncidentsPast3Years}
              onChange={(v) => onChange('dbHasIncidentsPast3Years', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            {data.dbHasIncidentsPast3Years === 'yes' && (
              <div className="mt-3">
                <FileUpload
                  label="Upload Incident Report / 上傳事故報告"
                  name="dbIncidentsFile"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(file) => onChange('dbIncidentsFile', file)}
                />
              </div>
            )}
          </div>

          <div>
            <FormSelect
              label="Any Litigation in Past 3 Years / 過去3年是否有訴訟"
              name="dbHasLitigationPast3Years"
              type="radio"
              required
              value={data.dbHasLitigationPast3Years}
              onChange={(v) => onChange('dbHasLitigationPast3Years', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            {data.dbHasLitigationPast3Years === 'yes' && (
              <div className="mt-3">
                <FileUpload
                  label="Upload Litigation Details / 上傳訴訟詳情"
                  name="dbLitigationFile"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(file) => onChange('dbLitigationFile', file)}
                />
              </div>
            )}
          </div>
        </div>
      </FormSection>
    </div>
  );
}
