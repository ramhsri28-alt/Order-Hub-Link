import { AdminLayout } from "@/components/admin-layout";
import { useMenu, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/use-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Image,
  Tag,
  Percent
} from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { MenuItem } from "@shared/schema";

const categories = ["Starters", "Mains", "Drinks", "Desserts"];

function AddMenuItemDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("Mains");
  const [discount, setDiscount] = useState("0");
  
  const createItem = useCreateMenuItem();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem.mutateAsync({
        name,
        description,
        price: Math.round(parseFloat(price) * 100),
        imageUrl,
        category,
        discount: parseInt(discount) || 0,
        available: true,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setCategory("Mains");
      setDiscount("0");
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-add-menu-item">
          <Plus className="w-4 h-4" />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Menu Item</DialogTitle>
          <DialogDescription>
            Add a new dish to your menu
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Dish Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter dish name"
              required
              data-testid="input-dish-name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the dish"
              required
              data-testid="input-dish-description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs.) *</Label>
              <Input
                id="price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="250"
                required
                data-testid="input-dish-price"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                data-testid="input-dish-discount"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL *</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              required
              data-testid="input-dish-image"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={createItem.isPending}
            data-testid="button-save-menu-item"
          >
            {createItem.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
            ) : (
              "Add to Menu"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMenuItemDialog({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(String(item.price / 100));
  const [imageUrl, setImageUrl] = useState(item.imageUrl);
  const [category, setCategory] = useState(item.category);
  const [discount, setDiscount] = useState(String(item.discount || 0));
  const [available, setAvailable] = useState(item.available);
  
  const updateItem = useUpdateMenuItem();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateItem.mutateAsync({
        id: item.id,
        name,
        description,
        price: Math.round(parseFloat(price) * 100),
        imageUrl,
        category,
        discount: parseInt(discount) || 0,
        available,
      });
      setOpen(false);
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" data-testid={`button-edit-${item.id}`}>
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Menu Item</DialogTitle>
          <DialogDescription>
            Update dish details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Dish Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (Rs.) *</Label>
              <Input
                id="edit-price"
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-discount">Discount (%)</Label>
              <Input
                id="edit-discount"
                type="number"
                min="0"
                max="100"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-imageUrl">Image URL *</Label>
            <Input
              id="edit-imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <Label htmlFor="edit-available" className="font-medium">Available for Order</Label>
              <p className="text-sm text-muted-foreground">Toggle to show/hide from menu</p>
            </div>
            <Switch
              id="edit-available"
              checked={available}
              onCheckedChange={setAvailable}
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={updateItem.isPending}>
            {updateItem.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const deleteItem = useDeleteMenuItem();
  const discountedPrice = item.discount > 0 
    ? item.price * (1 - item.discount / 100) 
    : item.price;
  
  return (
    <Card className={`overflow-hidden ${!item.available ? 'opacity-60' : ''}`}>
      <div className="relative h-40 overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {item.discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            {item.discount}% OFF
          </Badge>
        )}
        {!item.available && (
          <Badge variant="secondary" className="absolute top-2 left-2">
            Unavailable
          </Badge>
        )}
      </div>
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold">{item.name}</h3>
            <Badge variant="outline" className="text-xs mt-1">
              {item.category}
            </Badge>
          </div>
          <div className="text-right">
            {item.discount > 0 ? (
              <>
                <span className="text-sm line-through text-muted-foreground">
                  {formatCurrency(item.price)}
                </span>
                <span className="block font-bold text-green-600">
                  {formatCurrency(discountedPrice)}
                </span>
              </>
            ) : (
              <span className="font-bold">{formatCurrency(item.price)}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {item.description}
        </p>
        <div className="flex gap-2">
          <EditMenuItemDialog item={item} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" data-testid={`button-delete-${item.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Menu Item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{item.name}" from your menu. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteItem.mutate(item.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminMenu() {
  const { data: menuItems, isLoading } = useMenu();
  
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="h-[50vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }
  
  const groupedItems = menuItems?.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>) || {};
  
  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage your menu items</p>
        </div>
        <AddMenuItemDialog />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Image className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems?.filter(i => i.available).length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">On Discount</CardTitle>
            <Percent className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems?.filter(i => i.discount > 0).length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedItems).length}</div>
          </CardContent>
        </Card>
      </div>
      
      {categories.map(category => {
        const items = groupedItems[category] || [];
        if (items.length === 0) return null;
        
        return (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-bold mb-4">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        );
      })}
      
      {(!menuItems || menuItems.length === 0) && (
        <div className="text-center py-20 bg-card rounded-xl border border-dashed">
          <Image className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No menu items yet</h3>
          <p className="text-muted-foreground mb-6">Start by adding your first dish!</p>
          <AddMenuItemDialog />
        </div>
      )}
    </AdminLayout>
  );
}
