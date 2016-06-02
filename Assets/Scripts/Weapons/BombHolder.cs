using UnityEngine;
using System.Collections;

public class BombHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Bomb bomb;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Bomb currbomb = Instantiate(bomb, new Vector2(transform.position.x + .5f, transform.position.y + 0.5f), bomb.transform.rotation) as Bomb;
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currbomb.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currbomb.GetComponent<Bomb>().ShootRight();
        }
        else
        {
            Bomb currbomb = Instantiate(bomb, new Vector2(transform.position.x - .5f, transform.position.y + 0.5f), Quaternion.Inverse(bomb.transform.rotation)) as Bomb;
            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currbomb.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currbomb.GetComponent<Bomb>().ShootLeft();
        }
    }
}
