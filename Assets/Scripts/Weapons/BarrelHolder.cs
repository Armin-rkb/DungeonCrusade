using UnityEngine;
using System.Collections;

public class BarrelHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private Barrel barrel;
    private PlayerFlip flip;


    void Awake()
    {
        flip = GetComponent<PlayerFlip>();
    }

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Barrel currbarrel = Instantiate(barrel, new Vector2(transform.position.x + 1, transform.position.y), barrel.transform.rotation) as Barrel;
            Physics2D.IgnoreCollision(currbarrel.GetComponent<Collider2D>(), GetComponent<Collider2D>());
            currbarrel.GetComponent<Barrel>().ShootRight();
        }
        else
        {
            Barrel currbarrel = Instantiate(barrel, new Vector2(transform.position.x - 1, transform.position.y), Quaternion.Inverse(barrel.transform.rotation)) as Barrel;
            Physics2D.IgnoreCollision(currbarrel.GetComponent<Collider2D>(), GetComponent<Collider2D>());
            currbarrel.GetComponent<Barrel>().ShootLeft();
        }
    }
}
