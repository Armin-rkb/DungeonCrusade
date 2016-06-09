using UnityEngine;
using System.Collections;

public class DuckHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Duck duck;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;


    public delegate void DuckEventHandler();
    public DuckEventHandler OnDuckThrow;

    public void Shoot()
    {


        if (OnDuckThrow != null)
            OnDuckThrow();

        if (flip.facingRight)
        {
            Duck currDuck = Instantiate(duck, new Vector2(transform.position.x + .5f, transform.position.y), duck.transform.rotation) as Duck;

            currDuck.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currDuck.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currDuck.GetComponent<Duck>().ShootRight();
        }
        else
        {
            Duck currDuck = Instantiate(duck, new Vector2(transform.position.x - .5f, transform.position.y), Quaternion.Inverse(duck.transform.rotation)) as Duck;

            currDuck.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;
            
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currDuck.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currDuck.GetComponent<Duck>().ShootLeft();
        }
    }
}
