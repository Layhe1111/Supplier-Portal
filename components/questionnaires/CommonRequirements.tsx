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
  const [showInfoSharingTerms, setShowInfoSharingTerms] = React.useState(false);

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
            label={
              <span
                className="underline decoration-dotted underline-offset-2 decoration-gray-400 cursor-pointer"
                onClick={() => setShowInfoSharingTerms(true)}
              >
                Agree to information sharing terms / 同意信息共享條款
              </span>
            }
            name="agreeInfoSharing"
            checked={data.agreeInfoSharing}
            onChange={(v) => onChange('agreeInfoSharing', v)}
            required
            linkLabel={false}
          />
        </div>
      </FormSection>

      {/* Submitter Information */}
      <FormSection title="Contact Information / 聯絡人資料">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Contact Person / 聯絡人"
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
            label="Email / 電郵"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-light text-gray-700 mb-1">
              Contact Fax / 聯絡傳真
            </label>
            <div className="flex gap-2">
              <select
                value={data.contactFaxCode || '+852'}
                onChange={(e) => onChange('contactFaxCode', e.target.value)}
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
                name="contactFax"
                value={data.contactFax || ''}
                onChange={(e) => onChange('contactFax', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="Enter fax number"
              />
            </div>
          </div>
        </div>
      </FormSection>

      {showInfoSharingTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded shadow-lg">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <p className="text-base font-medium text-gray-900">
                  Information Sharing Terms / 信息共享條款
                </p>
                <p className="text-xs font-light text-gray-600">
                  ProjectPilot Supplier Portal
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoSharingTerms(false)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Close terms"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-gray-700">
              <p>
                These terms explain how ProjectPilot collects, uses, and shares the information you
                submit through this Supplier Portal for onboarding, qualification, and product
                showcase. 勾選表示你同意平台為入駐、審核及產品展示之目的收集、使用及共享所提交的資料。
              </p>

              <div className="space-y-2">
                <p className="font-medium text-gray-900">Scope of information / 資料範圍</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Company identity, registration numbers, licenses, and uploaded certificates /
                    公司身份、註冊號碼、營業執照及所上傳的證照文件
                  </li>
                  <li>
                    Contact persons, roles, phone numbers, emails, and organization charts /
                    聯絡人、職位、電話、電郵及組織架構
                  </li>
                  <li>
                    Product and service details (SKUs, pricing, MOQ, lead time, specs, photos,
                    files, 3D models) / 產品與服務資料（SKU、價格、MOQ、货期、規格、圖片、文件、3D模型）
                  </li>
                  <li>
                    Project experience, case highlights, and capability statements for design,
                    build, or material/furniture supply / 設計、施工或材料家具供應相關的項目經驗、案例及能力說明
                  </li>
                  <li>
                    Supplementary links or uploads you provide for qualification / 你為資質審核提供的補充鏈接或文件
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-gray-900">Purpose / 使用目的</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Supplier onboarding, verification, and ongoing quality supervision /
                    供應商入駐、核驗及持續質量監督
                  </li>
                  <li>
                    Matching your offerings to ProjectPilot&apos;s design/build/material needs and
                    showing them in the dashboard / 將你的產品與服務匹配至平台的設計、施工或材料需求並在儀表板展示
                  </li>
                  <li>
                    Preparing pre-qualification, proposals, or sourcing packs for project owners or
                    their consultants / 為業主或其顧問準備預審、方案或採購資料
                  </li>
                  <li>
                    Improving platform features using aggregated or anonymized insights / 使用彙總或匿名化數據優化平台功能
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-gray-900">Who may receive it / 可能共享的對象</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    ProjectPilot operations, procurement, and vendor-vetting teams /
                    ProjectPilot 的運營、採購及供應商審核團隊
                  </li>
                  <li>
                    Authorized project owners, consultants, designers, contractors, or partners
                    engaged by ProjectPilot for evaluation, shortlisting, or collaboration /
                    經 ProjectPilot 授權的業主、顧問、設計師、承建方或合作夥伴，用於評估、入圍或合作
                  </li>
                  <li>
                    Service providers that host or process data for us (e.g., planned backend such as
                    Supabase) under confidentiality obligations / 為我們提供託管或數據處理的服務商（如計劃中的
                    Supabase 後端），並受保密義務約束
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-gray-900">Data handling / 資料處理</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Draft data is saved to your account until submission, so you can continue later
                    after signing in / 草稿數據會保存到你的帳號下，登入後可繼續填寫
                  </li>
                  <li>
                    Submitted data may be stored in ProjectPilot-managed systems and backups to power
                    registration and dashboards, and may be migrated when backend services go live /
                    提交後的數據會存於 ProjectPilot 管理的系統及備份，並可能在後端上線時遷移
                  </li>
                  <li>
                    We may use aggregated or anonymized statistics to improve service; we do not sell
                    personal data / 我們可能使用彙總或匿名化統計改進服務，不會出售個人資料
                  </li>
                  <li>
                    You can request updates or removal of submitted data; platform functionality may
                    be limited after removal / 你可要求更新或刪除已提交資料；刪除後平台功能可能受限
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-gray-900">Your commitments / 你的承諾</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    Information is accurate, current, and you have the right to share all files,
                    photos, and project references (anonymize client names if needed) / 保證資料真實、最新，並擁有分享文件、
                    圖片及項目案例的權利（如需，可對客戶名稱做匿名處理）
                  </li>
                  <li>
                    Do not upload confidential or third-party information without permission / 未經允許請勿上傳保密或第三方資料
                  </li>
                  <li>
                    You consent to ProjectPilot contacting the listed contacts about onboarding,
                    quality supervision, or project opportunities / 同意 ProjectPilot 就入駐、質量監督或項目機會聯繫上述聯絡人
                  </li>
                  <li>
                    Agreement does not guarantee approval or contract awards; ProjectPilot may verify
                    submissions and remove content that violates policies / 同意條款不代表必定獲批或中標；ProjectPilot
                    有權核實並刪除違規內容
                  </li>
                </ul>
              </div>

              <p>
                By checking the box, you confirm the above and authorize ProjectPilot to use and
                share your submitted information as described. 勾選即表示你確認並授權 ProjectPilot 按上述方式使用及共享你提交的資料。
              </p>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setShowInfoSharingTerms(false)}
                className="px-4 py-2 text-sm font-light text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                Close / 關閉
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('agreeInfoSharing', true);
                  setShowInfoSharingTerms(false);
                }}
                className="px-4 py-2 text-sm font-light text-white bg-gray-900 hover:bg-gray-800"
              >
                Agree & Continue / 同意並繼續
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
