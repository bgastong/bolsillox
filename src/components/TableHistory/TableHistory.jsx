import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../../hooks/useLanguage";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function TableHistory() {
  const { t } = useLanguage();
  return (
    <Table>
      <TableCaption>{t("footerhistory")}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">{t("category")}</TableHead>
          <TableHead>{t("method")}</TableHead>
          <TableHead className="text-right">{t("amount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">INV001</TableCell>
          <TableCell>Credit Card</TableCell>
          <TableCell className="text-right">$250.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export default TableHistory;
