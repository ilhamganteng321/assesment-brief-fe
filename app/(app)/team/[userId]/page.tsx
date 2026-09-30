import { UserProfileSection } from "@/features/users/components/user-profile-section";

type UserProfilePageProps = {
	params: Promise<{ userId: string }>;
};

/**
 * One person's profile.
 *
 * A separate page from `/team` so it can be linked to directly, and separate
 * again from `/settings`, which is the signed-in user's own account. This one is
 * for looking somebody else up.
 */
export default async function UserProfilePage({
	params,
}: UserProfilePageProps) {
	const { userId } = await params;

	return <UserProfileSection userId={userId} />;
}
