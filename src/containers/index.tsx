import { EMR } from '@beda.software/emr/containers';
import { defaultMenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';

export function App() {
    return <EMR menuLayout={defaultMenuLayout} />;
}
