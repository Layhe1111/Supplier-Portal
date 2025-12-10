import React from 'react';
import FormSection from '../FormSection';
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
  const phoneCodeOptions = [
    '+852',
    '+86',
    '+853',
    '+886',
    '+65',
    '+60',
    '+81',
    '+82',
    '+44',
    '+1',
    '+61',
    '+971',
  ];

  return (
    <>
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
      <FormSection title="Contact Information / 联系人信息">
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
          <div>
            <label className="block text-sm font-light text-gray-700 mb-1">
              Contact Number / 聯繫電話 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={data.submitterPhoneCode}
                onChange={(e) => onChange('submitterPhoneCode', e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {phoneCodeOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                name="submitterPhone"
                required
                value={data.submitterPhone}
                onChange={(e) => onChange('submitterPhone', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="e.g., 91234567"
              />
            </div>
          </div>

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
