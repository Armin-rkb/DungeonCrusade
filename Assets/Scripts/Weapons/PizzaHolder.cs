using UnityEngine;
using System.Collections;

public class PizzaHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Pizza pizza;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;
   
    public void Shoot()
    {
        if (flip.facingRight)
        {
            Pizza currPizza = Instantiate(pizza, new Vector2(transform.position.x + .5f, transform.position.y), pizza.transform.rotation) as Pizza;

            currPizza.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currPizza.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currPizza.GetComponent<Pizza>().ShootRight();
        }
        else
        {
            Pizza currPizza = Instantiate(pizza, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(pizza.transform.rotation)) as Pizza;

            currPizza.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currPizza.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currPizza.GetComponent<Pizza>().ShootLeft();
        }
    }
}
