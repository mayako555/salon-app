import { redirect } from "next/navigation";

export default async function Home(props: any) {
  // LIFFからのリダイレクト時に付与与与される ?liff.state= を捕捉して転送する
  const searchParams = await props.searchParams;
  if (searchParams && typeof searchParams === 'object' && searchParams['liff.state']) {
    const liffState = searchParams['liff.state'];
    if (typeof liffState === 'string' && liffState.startsWith('/')) {
      redirect(liffState);
    }
  }

  redirect("/dashboard");
}
