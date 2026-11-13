import { Tabs } from 'expo-router/js-tabs';

import { IconBoard, IconClips, IconMarket, IconMe, IconRides, IconRooms } from '@/components/icons';
import { useApp } from '@/lib/store';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  const t = useApp((s) => s.t);
  useApp((s) => s.lang); // re-render labels when the language changes
  const tab = (title: string, Icon: typeof IconRides) => ({
    title,
    tabBarIcon: ({ color }: { color: unknown }) => <Icon color={typeof color === 'string' ? color : C.muted} size={24} width={1.8} />,
  });
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.line },
      }}>
      <Tabs.Screen name="index" options={tab(t('tabRides'), IconRides)} />
      <Tabs.Screen name="clips" options={tab(t('tabClips'), IconClips)} />
      <Tabs.Screen name="market" options={tab(t('tabMarket'), IconMarket)} />
      <Tabs.Screen name="board" options={tab(t('tabBoard'), IconBoard)} />
      <Tabs.Screen name="rooms" options={tab(t('tabRooms'), IconRooms)} />
      <Tabs.Screen name="me" options={tab(t('tabMe'), IconMe)} />
    </Tabs>
  );
}
