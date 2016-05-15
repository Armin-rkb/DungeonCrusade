using UnityEngine;
using System.Collections;

public class PizzaHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Pizza pizza;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Pizza currPizza = Instantiate(pizza, new Vector2(transform.position.x + 1, transform.position.y), pizza.transform.rotation) as Pizza;
            Physics2D.IgnoreCollision(currPizza.GetComponent<Collider2D>(), GetComponent<Collider2D>());
            currPizza.GetComponent<Pizza>().ShootRight();
        }
        else
        {
            Pizza currPizza = Instantiate(pizza, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(pizza.transform.rotation)) as Pizza;
            Physics2D.IgnoreCollision(currPizza.GetComponent<Collider2D>(), GetComponent<Collider2D>());
            currPizza.GetComponent<Pizza>().ShootLeft();
        }
    }
}
