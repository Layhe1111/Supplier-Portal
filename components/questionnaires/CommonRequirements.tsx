import React from 'react';
import FormSection from '../FormSection';
import FileUpload from '../FileUpload';
import FormCheckbox from '../FormCheckbox';
import FormInput from '../FormInput';
import { CommonRequirements as CommonReq } from '@/types/supplier';

interface CommonRequirementsProps {
  data: CommonReq;
  onChange: <K extends keyof CommonReq>(field: K, value: CommonReq[K]) => void;
}

export default function CommonRequirements({
  data,
  onChange,
}: CommonRequirementsProps) {
  return (
    <>
      {/* Document Checklist */}
      <FormSection title="Document Checklist / 文件上傳清單">
        <p className="text-sm text-gray-600 mb-4">
          All suppliers must provide / 所有供應商需提供：
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUpload
            label="Business Registration / 商業登記證"
            name="businessRegistration"
            required
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(file) => onChange('businessRegistration', file)}
          />

          <FileUpload
            label="Company Photos / 公司形象照片"
            name="companyPhotos"
            accept=".jpg,.jpeg,.png"
            onChange={(file) => onChange('companyPhotos', file)}
          />
        </div>
      </FormSection>

      {/* Quality Commitment */}
      <FormSection title="Quality Commitment / 質量承諾">
        <div className="space-y-3">
          <FormCheckbox
            label="Guarantee all information provided is true and valid / 保證提供資料真實有效"
            name="guaranteeInfoTrue"
            checked={data.guaranteeInfoTrue}
            onChange={(v) => onChange('guaranteeInfoTrue', v)}
            required
          />

          <FormCheckbox
            label="Accept platform quality supervision / 接受平台質量監督"
            name="acceptQualitySupervision"
            checked={data.acceptQualitySupervision}
            onChange={(v) => onChange('acceptQualitySupervision', v)}
            required
          />

          <FormCheckbox
            label="Agree to information sharing terms / 同意信息共享條款"
            name="agreeInfoSharing"
            checked={data.agreeInfoSharing}
            onChange={(v) => onChange('agreeInfoSharing', v)}
            required
          />
        </div>
      </FormSection>

      {/* Submitter Information */}
      <FormSection title="Submitter Information / 提交人信息">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Contact Person / 联系人"
            name="submitterName"
            required
            value={data.submitterName}
            onChange={(v) => onChange('submitterName', v)}
          />

          <FormInput
            label="Position / 職位"
            name="submitterPosition"
            required
            value={data.submitterPosition}
            onChange={(v) => onChange('submitterPosition', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Contact Number / 聯繫電話"
            name="submitterPhone"
            type="tel"
            required
            value={data.submitterPhone}
            onChange={(v) => onChange('submitterPhone', v)}
          />

          <FormInput
            label="Email / 邮箱"
            name="submitterEmail"
            type="email"
            required
            value={data.submitterEmail}
            onChange={(v) => onChange('submitterEmail', v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Submission Date / 提交日期"
            name="submissionDate"
            type="date"
            required
            value={data.submissionDate}
            onChange={(v) => onChange('submissionDate', v)}
          />
        </div>
      </FormSection>
    </>
  );
}
