import { PageHeader } from "@/components/layout/page-header";
import { InvitationAcceptSection } from "@/features/invitations/components/invitation-accept-section";

type InvitationAcceptPageProps = {
	searchParams: Promise<{ token?: string | string[] }>;
};

/**
 * Where an emailed invitation link lands.
 *
 * A server component that does nothing but read the token out of the URL and hand
 * it to the client section. The token is a query parameter rather than a path
 * segment so that it never reaches a server log line that records paths, and it is
 * read here and passed down rather than read in the browser from `window`, so the
 * value the page acts on is the one the link carried.
 *
 * The route lives inside the authenticated layout group, so an unauthenticated
 * visit is redirected to sign in with this exact URL — token included — as the
 * return path. That is the whole of the token handoff: it survives authentication
 * because it was never stored anywhere, and it disappears when this page is left.
 */
export default async function InvitationAcceptPage({
	searchParams,
}: InvitationAcceptPageProps) {
	const params = await searchParams;
	const rawToken = params.token;
	const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Project invitation"
				description="Accept an invitation to join a project you have been sent."
			/>

			<InvitationAcceptSection token={token} />
		</div>
	);
}
