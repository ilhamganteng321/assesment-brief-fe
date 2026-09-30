import { UserDirectorySection } from "@/features/users/components/user-directory-section";

/**
 * The team directory.
 *
 * A server component that renders one client component, so the page itself adds
 * nothing to the bundle. The directory reads its own state from the URL, which is
 * why the route is a plain path with no segment of its own — the filters live in
 * the query string where they can be shared and survived by a refresh.
 */
export default function TeamPage() {
	return <UserDirectorySection />;
}
