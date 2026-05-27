// String-name → lucide icon, so mock data / configs can reference icons by name.
import {
  LayoutDashboard, PlugZap, Sprout, ListChecks, Building2, Globe, Upload,
  ShieldCheck, FileText, Settings, PoundSterling, TrendingUp, Target, Percent,
  Mail, Star, Trophy, Crown, Megaphone, Users, Bot, Download, Filter, LogOut,
} from 'lucide-react';

const MAP = {
  LayoutDashboard, PlugZap, Sprout, ListChecks, Building2, Globe, Upload,
  ShieldCheck, FileText, Settings, PoundSterling, TrendingUp, Target, Percent,
  Mail, Star, Trophy, Crown, Megaphone, Users, Bot, Download, Filter, LogOut,
};

export default function Icon({ name, size = 18, ...rest }) {
  const Cmp = MAP[name] || Target;
  return <Cmp size={size} {...rest} />;
}
