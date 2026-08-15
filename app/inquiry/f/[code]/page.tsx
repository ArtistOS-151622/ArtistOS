import { PublicInquiryForm } from "@/components/common/inquiries/public-inquiry-form"

type InquiryPageProps = {
  params: Promise<{ code: string }>
}

export default async function InquiryPage({ params }: InquiryPageProps) {
  const { code } = await params
  return <PublicInquiryForm formCode={code} />
}

