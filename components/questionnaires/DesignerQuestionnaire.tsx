import React from 'react';
import FormSection from '../FormSection';
import FormInput from '../FormInput';
import FormSelect from '../FormSelect';
import { DesignerFormData } from '@/types/supplier';

interface DesignerQuestionnaireProps {
  data: DesignerFormData;
  onChange: <K extends keyof DesignerFormData>(
    field: K,
    value: DesignerFormData[K]
  ) => void;
}

export default function DesignerQuestionnaire({
  data,
  onChange,
}: DesignerQuestionnaireProps) {
  const feeStructureOptions = [
    { value: 'byArea', label: 'By Area 按面積' },
    { value: 'byProject', label: 'By Project 按項目' },
    { value: 'other', label: 'Other 其他' },
  ];

  const designStyleOptions = [
    { value: 'modernMinimalist', label: 'Modern Minimalist 現代簡約' },
    { value: 'chinese', label: 'Chinese Style 中式' },
    { value: 'european', label: 'European Style 歐式' },
    { value: 'industrial', label: 'Industrial 工業風' },
    { value: 'eclectic', label: 'Eclectic 混搭' },
    { value: 'other', label: 'Other 其他' },
  ];

  return (
    <>
      {/* Section 1: Design Company Overview */}
      <FormSection title="Section 1: Design Company Overview / 設計公司概況">
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

        <FormInput
          label="Office Address / 辦公地址"
          name="officeAddress"
          required
          value={data.officeAddress}
          onChange={(v) => onChange('officeAddress', v)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Design Qualification Level / 設計資質等級"
            name="designQualificationLevel"
            required
            value={data.designQualificationLevel}
            onChange={(v) => onChange('designQualificationLevel', v)}
          />

          <FormInput
            label="Design Team Size / 設計團隊規模"
            name="designTeamSize"
            type="number"
            required
            value={data.designTeamSize}
            onChange={(v) => onChange('designTeamSize', v)}
          />
        </div>

        <FormInput
          label="Lead Designer Experience / 主創設計師資歷"
          name="leadDesignerExperience"
          required
          value={data.leadDesignerExperience}
          onChange={(v) => onChange('leadDesignerExperience', v)}
          placeholder="e.g., 10 years in commercial design"
        />

        <FormSelect
          label="Fee Structure / 設計收費模式"
          name="feeStructure"
          type="checkbox"
          multiple
          required
          value={data.feeStructure}
          onChange={(v) => onChange('feeStructure', v as string[])}
          options={feeStructureOptions}
        />
      </FormSection>

      {/* Section 2: Design Specialization */}
      <FormSection title="Section 2: Design Specialization / 設計專業">
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Design Focus / 設計領域
          </h4>
          <FormSelect
            label="Design Styles / 擅長風格"
            name="designStyles"
            type="checkbox"
            multiple
            required
            value={data.designStyles}
            onChange={(v) => onChange('designStyles', v as string[])}
            options={designStyleOptions}
          />
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Software Capability / 軟件能力
          </h4>
          <div className="space-y-4">
            <FormSelect
              label="BIM Capability / BIM能力"
              name="bimCapability"
              type="radio"
              required
              value={data.bimCapability}
              onChange={(v) => onChange('bimCapability', v as 'yes' | 'no')}
              options={[
                { value: 'yes', label: 'Yes 是' },
                { value: 'no', label: 'No 否' },
              ]}
            />

            <FormInput
              label="Main Software / 主要軟件"
              name="mainSoftware"
              required
              value={data.mainSoftware}
              onChange={(v) => onChange('mainSoftware', v)}
              placeholder="e.g., AutoCAD, SketchUp, Revit"
            />
          </div>
        </div>
      </FormSection>
    </>
  );
}
