import { Badge } from "@/components/ui/badge";
import { useLanguage } from "../../hooks/useLanguage";
import { mockExpenses } from "../../data/mockExpenses";
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
          <TableHead className="w-[100px]">{t("titleHistory")}</TableHead>
          <TableHead>{t("category")}</TableHead>
          <TableHead>{t("method")}</TableHead>
          <TableHead className="text-right">{t("amount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mockExpenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell className="font-medium">{expense.title}</TableCell>
            <TableCell>{expense.category}</TableCell>
            <TableCell>{expense.paymentMethod}</TableCell>
            <TableCell className="text-right">${expense.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default TableHistory;
